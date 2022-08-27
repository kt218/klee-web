from rest_framework import serializers
from frontend.models import Project, File, GameChallenge


class ProjectSerializer(serializers.HyperlinkedModelSerializer):
    default_file = serializers.PrimaryKeyRelatedField(
        queryset=File.objects.all(), default=None)

    class Meta:
        model = Project
        fields = ('id', 'name', 'default_file', 'example', 'game')


class RunConfigurationField(serializers.Field):
    def get_attribute(self, obj):
        return obj

    def to_representation(self, obj):
        return {
            'sym_args': {
                'range': [obj.min_sym_args, obj.max_sym_args],
                'size': obj.size_sym_args
            },
            'sym_files': {
                'size': obj.size_files,
                'num': obj.num_files
            },
            'sym_in': {
                'size': obj.size_sym_in,
            },
            'options': obj.options,
            'arguments': obj.arguments
        }

    def to_internal_value(self, data):
        return {
            'size_files': data['sym_files']['size'],
            'num_files': data['sym_files']['num'],
            'size_sym_in': data['sym_in']['size'],
            'min_sym_args': data['sym_args']['range'][0],
            'max_sym_args': data['sym_args']['range'][1],
            'size_sym_args': data['sym_args']['size'],
            'options': data['options'],
            'arguments': data['arguments'],
        }


class FileSerializer(serializers.HyperlinkedModelSerializer):
    run_configuration = RunConfigurationField()
    project_id = serializers.PrimaryKeyRelatedField(read_only=True)
    challenge_id = serializers.PrimaryKeyRelatedField(
        queryset=GameChallenge.objects.all(), default=None)

    def create(self, validated_data):
        # Hack to unpack run configuration to fields in the model
        validated_data.update(validated_data['run_configuration'])
        del validated_data['run_configuration']

        return super(FileSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        validated_data.update(validated_data['run_configuration'])
        del validated_data['run_configuration']

        return super(FileSerializer, self).update(instance, validated_data)

    class Meta:
        model = File
        fields = ('id', 'name', 'code', 'run_configuration', 'project_id',
                  'challenge_id')


class GameChallengeSerializer(serializers.HyperlinkedModelSerializer):
    project_id = serializers.PrimaryKeyRelatedField(read_only=True)
    solution_code = FileSerializer()
    default_user_code = serializers.PrimaryKeyRelatedField(
        queryset=File.objects.all(), default=None)

    class Meta:
        model = GameChallenge
        fields = ('id', 'name', 'task_md', 'project_id', 'solution_code',
                  'default_user_code')
