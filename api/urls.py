from django.urls import path
from . import views

urlpatterns = [
    # 1. Auth endpoints
    path('auth/login', views.api_login, name='api_login'),
    path('auth/register', views.api_register, name='api_register'),

    # 2. Freelancers endpoints
    path('freelancers', views.api_freelancers, name='api_freelancers'),
    path('freelancers/<int:fid>', views.api_freelancer_detail, name='api_freelancer_detail'),
    path('freelancers/<int:fid>/past-work', views.api_past_work, name='api_past_work'),

    # 3. Recruiters & Jobs endpoints
    path('recruiters', views.api_recruiters, name='api_recruiters'),
    path('jobs', views.api_jobs, name='api_jobs'),

    # 4. Matches endpoints
    path('matches/jobs-for-freelancer/<int:fid>', views.match_jobs_for_freelancer, name='match_jobs_for_freelancer'),
    path('matches/freelancers-for-job/<int:jid>', views.match_freelancers_for_job, name='match_freelancers_for_job'),

    # 5. Messages endpoints
    path('messages', views.api_messages, name='api_messages'),
    path('messages/partners', views.api_message_partners, name='api_message_partners'),
]
