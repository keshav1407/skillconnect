from django.db import models

class UserProfile(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    role = models.CharField(max_length=50)  # 'freelancer' or 'recruiter'
    profile_id = models.IntegerField()

    def __str__(self):
        return f"{self.username} ({self.role})"

class Freelancer(models.Model):
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    bio = models.TextField(blank=True, null=True)
    skills = models.TextField(default='[]')  # JSON list of skills
    wage_amount = models.FloatField(default=45.0)
    wage_basis = models.CharField(max_length=50, default='Hourly')
    experience_years = models.IntegerField(default=1)
    availability = models.CharField(max_length=100, default='Immediate')
    rating = models.FloatField(default=5.0)
    efficiency_rating = models.FloatField(default=90.0)
    portfolio_url = models.CharField(max_length=500, blank=True, null=True, default='')

    def __str__(self):
        return self.name

class Recruiter(models.Model):
    name = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    industry = models.CharField(max_length=255, blank=True, null=True, default='')
    bio = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} at {self.company}"

class PastWork(models.Model):
    freelancer = models.ForeignKey(Freelancer, on_delete=models.CASCADE, related_name='past_work')
    project_name = models.CharField(max_length=255)
    client_company = models.CharField(max_length=255)
    duration = models.CharField(max_length=100)
    description = models.TextField()
    project_efficiency = models.IntegerField()

    def __str__(self):
        return f"{self.project_name} - {self.freelancer.name}"

class Job(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    budget = models.FloatField()
    required_skills = models.TextField(default='[]')  # JSON list of skills
    duration = models.CharField(max_length=100)
    recruiter = models.ForeignKey(Recruiter, on_delete=models.CASCADE, related_name='jobs')

    def __str__(self):
        return self.title

class Message(models.Model):
    sender_id = models.IntegerField()
    sender_role = models.CharField(max_length=50)  # 'freelancer' or 'recruiter'
    receiver_id = models.IntegerField()
    receiver_role = models.CharField(max_length=50)  # 'freelancer' or 'recruiter'
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender_role} {self.sender_id} -> {self.receiver_role} {self.receiver_id} ({self.timestamp})"
