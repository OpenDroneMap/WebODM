from rest_framework import serializers

class TagsField(serializers.JSONField):
    def to_representation(self, tags):
        return [t for t in tags.split(" ") if t != ""]

    def to_internal_value(self, tags):
        return " ".join([t.strip() for t in tags])