from django.http import HttpResponse

def some_view(request):
    return HttpResponse("This is the some_view response.")

def another_view(request):
    return HttpResponse("This is the another_view response.")
