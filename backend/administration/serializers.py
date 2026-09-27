from rest_framework import serializers
from django.contrib.auth.models import User, Group, Permission
from django.utils.text import slugify
from .models import ResourceItem, AuditLog
import uuid

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    groups = serializers.PrimaryKeyRelatedField(many=True, queryset=Group.objects.all(), required=False)
    group_names = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'is_staff',
            'is_superuser',
            'is_active',
            'date_joined',
            'last_login',
            'groups',
            'group_names',
            'password',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']

    def get_group_names(self, obj):
        return [g.name for g in obj.groups.all()]

    def validate_password(self, value):
        if value and len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        groups = validated_data.pop('groups', [])
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        if groups:
            user.groups.set(groups)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        groups = validated_data.pop('groups', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        if groups is not None:
            instance.groups.set(groups)
        return instance


class ResourceItemSerializer(serializers.ModelSerializer):
    slug = serializers.SlugField(required=False, allow_blank=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = ResourceItem
        fields = [
            'id',
            'title',
            'slug',
            'category',
            'status',
            'priority',
            'summary',
            'metadata',
            'assigned_to',
            'assigned_to_username',
            'created_by',
            'created_by_username',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def validate(self, attrs):
        title = attrs.get('title')
        slug = attrs.get('slug')
        if not slug and title:
            base_slug = slugify(title)
            # Ensure unique slug
            unique_slug = base_slug
            counter = 1
            qs = ResourceItem.objects.all()
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            while qs.filter(slug=unique_slug).exists():
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            attrs['slug'] = unique_slug
        return attrs


class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'username',
            'action',
            'resource_type',
            'resource_id',
            'details',
            'ip_address',
            'timestamp',
        ]
        read_only_fields = [
            'id',
            'user',
            'username',
            'action',
            'resource_type',
            'resource_id',
            'details',
            'ip_address',
            'timestamp',
        ]
