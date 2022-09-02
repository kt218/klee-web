# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import os
import json

from django.db import models, migrations

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
FIXTURE_DIR = os.path.join(BASE_DIR, '..', 'fixtures')


def load_fixtures(apps, schema_editor):
    fixtures_file = os.path.join(FIXTURE_DIR, 'fixtures.json')
    with open(fixtures_file) as fixtures_data:
        fixtures = json.loads(fixtures_data.read())    
        # Create tutorial project
        add_fixtures(apps, fixtures, "Tutorials")
        # Create example project
        add_fixtures(apps, fixtures, "Examples")
        # Create game challenges
        add_challenges(apps, fixtures, "Challenges")


def add_fixtures(apps, fixtures, title):
    Project = apps.get_model("frontend", "Project")
    File = apps.get_model("frontend", "File")
            
    project = Project(name=title, example=True, game=False)
    project.save()
    for fixture in fixtures.get(title, []):
        figure = File(**fixture)
        code_path = os.path.join(FIXTURE_DIR, title, figure.name)
        with open(code_path, 'r') as code:
            figure.code = code.read()
        figure.project = project
        figure.save()


def add_challenges(apps, fixtures, title):
    Project = apps.get_model("frontend", "Project")
    File = apps.get_model("frontend", "File")
    GameChallenge = apps.get_model("frontend", "GameChallenge")

    project = Project(name=title, example=True, game=True)
    project.save()
    for challenge in fixtures.get(title, []):
        main = File(**challenge)
        main.name = f'{challenge["name"]}_main.c'
        code_path = os.path.join(FIXTURE_DIR,
                                 title,
                                 challenge["name"],
                                 'main.c')
        with open(code_path, 'r') as code:
            main.code = code.read()
        main.project = project
        main.save()

        game_challenge = GameChallenge(name=challenge["name"],
                                       project=project,
                                       main_code=main)
        md_path = os.path.join(FIXTURE_DIR,
                               title,
                               challenge["name"],
                               'task.md')
        with open(md_path, 'r') as md:
            game_challenge.task_md = md.read()
        template_path = os.path.join(FIXTURE_DIR,
                                     title,
                                     challenge["name"],
                                     'template.c')
        with open(template_path, 'r') as code:
            game_challenge.template_code = code.read()
        solution_path = os.path.join(FIXTURE_DIR,
                                     title,
                                     challenge["name"],
                                     'solution.c')
        with open(solution_path, 'r') as code:
            game_challenge.solution_code = code.read()
        game_challenge.save()


class Migration(migrations.Migration):
    dependencies = [
        ('frontend', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(load_fixtures)
    ]