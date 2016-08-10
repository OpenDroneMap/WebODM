from django import template
register = template.Library()

@register.filter()
def with_class(field, css):
   return field.as_widget(attrs={"class":css})