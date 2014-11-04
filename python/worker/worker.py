import os
import tempfile
import subprocess
import shutil
import shlex
import re
import json

import requests

from boto.s3.connection import S3Connection
from boto.s3.key import Key
from celery import Celery

celery = Celery(broker=os.environ["CELERY_BROKER_URL"], backend="rpc")

from celery.worker.control import Panel


@Panel.register
def get_uptime_stats(state):
    uptime_pattern = re.compile(
        r"up\s+(.*?),\s+([0-9]+) "
        r"users?,\s+load averages?: "
        r"([0-9]+\.[0-9][0-9]),?\s+([0-9]+\.[0-9][0-9])"
        r",?\s+([0-9]+\.[0-9][0-9])")

    uptime_output = subprocess.check_output("uptime")
    uptime_matches = uptime_pattern.search(uptime_output)

    return {
        'uptime': uptime_matches.group(1),
        'users': uptime_matches.group(2),
        'loadavg_1min': uptime_matches.group(3),
        'loadavg_5min': uptime_matches.group(4),
        'loadavg_15min': uptime_matches.group(5),
    }


# Uses a task id to create a separate channel
# for each job
def send_notification(endpoint, channel, data):
    requests.post(
        endpoint,
        data={'channel': channel, 'data': json.dumps(data)}
    )


def run_klee(docker_command, args):
    llvm_command = ['/src/llvm-gcc4.2-2.9-x86_64-linux/bin/llvm-gcc',
                    '-I', '/src/klee/include', '--emit-llvm', '-c', '-g',
                    '/code/result.c',
                    '-o', '/code/result.o']

    split_args = shlex.split(args)
    klee_command = ["klee"]
    if split_args:
        klee_command += ['--posix-runtime']
    klee_command += ["/code/result.o"] + shlex.split(args)

    subprocess.check_output(docker_command + llvm_command)
    klee_output = subprocess.check_output(docker_command + klee_command)
    return klee_output


def compress_output(file_name, tempdir):
    tar_command = ['tar', '-zcvf', file_name, 'klee-out-0']
    subprocess.check_output(tar_command, cwd=tempdir)


def upload_result(file_name, tempdir):
    conn = S3Connection(os.environ['AWS_ACCESS_KEY'],
                        os.environ['AWS_SECRET_KEY'])
    bucket = conn.get_bucket('klee-output')

    k = Key(bucket)
    k.key = file_name
    k.set_contents_from_filename(os.path.join(tempdir, file_name))
    k.set_acl('public-read')

    url = k.generate_url(expires_in=0, query_auth=False)
    return url


def send_email(email, url):
    mailgun_url = "sandboxf39013a9ad7c47f3b621a94023230030.mailgun.org"
    requests.post(
        "https://api.mailgun.net/v2/{}/messages".format(mailgun_url),
        auth=("api", os.environ['MAILGUN_API_KEY']),
        data={"from": "Klee <postmaster@{}>".format(mailgun_url),
              "to": "User <{}>".format(email),
              "subject": "Klee Submission Output",
              "text": "Your Klee submission output can be "
                      "accessed here: {}".format(url)})


@celery.task(name='submit_code', bind=True)
def submit_code(self, code, email, args, endpoint):
    task_id = self.request.id
    send_notification(endpoint, task_id, {'message': 'Submitting code'})
    tempdir = tempfile.mkdtemp(prefix=task_id)
    try:
        with open(os.path.join(tempdir, "result.c"), 'a+') as f:
            f.write(code)
            f.flush()

            docker_command = ['sudo', 'docker', 'run', '-t',
                              '-v', '{}:/code'.format(tempdir),
                              '--net="none"', 'kleeweb/klee']

            file_name = 'klee-output-{}.tar.gz'.format(task_id)

            send_notification(
                endpoint, task_id,
                {'message': 'Analysing with KLEE'}
            )

            klee_output = run_klee(docker_command, args)

            send_notification(
                endpoint, task_id, {'message': 'Compressing result'})
            compress_output(os.path.join(tempdir, file_name), tempdir)

            send_notification(
                endpoint, task_id, {'message': 'Uploading result'})
            url = upload_result(file_name, tempdir)

            send_email(email, url)
            send_notification(endpoint, task_id, {'message': 'Done'})

            send_notification(
                endpoint,
                task_id,
                data={
                    'message': 'Result',
                    'result': {
                        'output': klee_output.strip(),
                        'url': url
                    }
                }
            )
    except subprocess.CalledProcessError:
        send_notification(endpoint, task_id, {'message': 'An error occurred.'})
    finally:
        # Workaround for docker writing files as root.
        # Set owner of tmpdir back to current user.
        subprocess.check_call(
            ["sudo", "chown", "-R", "worker:worker", tempdir])
        shutil.rmtree(tempdir)
