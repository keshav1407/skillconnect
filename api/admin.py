from django.contrib import admin
from .models import UserProfile, Freelancer, Recruiter, PastWork, Job, Message

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'role', 'profile_id')
    search_fields = ('username', 'role')

@admin.register(Freelancer)
class FreelancerAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'title', 'wage_amount', 'wage_basis', 'experience_years', 'rating')
    search_fields = ('name', 'title')

@admin.register(Recruiter)
class RecruiterAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company', 'industry')
    search_fields = ('name', 'company')

@admin.register(PastWork)
class PastWorkAdmin(admin.ModelAdmin):
    list_display = ('id', 'project_name', 'client_company', 'project_efficiency', 'freelancer')
    search_fields = ('project_name', 'client_company')

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'budget', 'duration', 'recruiter')
    search_fields = ('title', 'recruiter__name')

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender_id', 'sender_role', 'receiver_id', 'receiver_role', 'timestamp')
    list_filter = ('sender_role', 'receiver_role')
