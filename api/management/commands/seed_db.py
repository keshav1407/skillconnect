from django.core.management.base import BaseCommand
from api.models import UserProfile, Freelancer, Recruiter, PastWork, Job, Message
import json
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds the SkillConnect database with demo profiles, work histories, jobs, and chat messages.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing database records...')
        UserProfile.objects.all().delete()
        PastWork.objects.all().delete()
        Freelancer.objects.all().delete()
        Job.objects.all().delete()
        Recruiter.objects.all().delete()
        Message.objects.all().delete()

        self.stdout.write('Seeding freelancers...')
        f1 = Freelancer.objects.create(
            name='Alice Chen',
            title='Senior React Developer',
            bio='Passionate front-end architect with 8 years of React expertise. Specializes in performance optimization, custom hook designs, and glassmorphic micro-animations.',
            skills=json.dumps(["React", "JavaScript", "CSS", "TypeScript", "Redux"]),
            wage_amount=85.00,
            wage_basis='Hourly',
            experience_years=8,
            availability='Immediate',
            rating=4.9,
            efficiency_rating=98.0,
            portfolio_url='https://alicechen.dev'
        )
        f2 = Freelancer.objects.create(
            name='Bob Smith',
            title='Backend Engineer',
            bio='Database and backend engineer focused on scalability, performance tuning, and robust security practices. Over 6 years of experience building solid API architectures.',
            skills=json.dumps(["Node.js", "Express", "SQL", "PostgreSQL", "Docker"]),
            wage_amount=600.00,
            wage_basis='Per Day',
            experience_years=6,
            availability='Part-Time',
            rating=4.8,
            efficiency_rating=92.0,
            portfolio_url='https://bobcodes.io'
        )
        f3 = Freelancer.objects.create(
            name='Clara Lopez',
            title='UI/UX Engineer',
            bio='Creating beautiful, pixel-perfect user interfaces with clean CSS layouts, SVG graphics, and interactive dashboard UI. Blends coding skills with design principles.',
            skills=json.dumps(["CSS", "Figma", "React", "HTML", "UI/UX"]),
            wage_amount=2600.00,
            wage_basis='Weekly',
            experience_years=4,
            availability='Immediate',
            rating=5.0,
            efficiency_rating=96.0,
            portfolio_url='https://claradesigns.com'
        )
        f4 = Freelancer.objects.create(
            name='David Kim',
            title='Fullstack Cloud Architect',
            bio='Versatile developer who builds enterprise-scale codebases from inception to deployment. Expert in cloud deployment, serverless backends, and modular frontends.',
            skills=json.dumps(["React", "Node.js", "TypeScript", "AWS", "SQL"]),
            wage_amount=12000.00,
            wage_basis='Monthly',
            experience_years=10,
            availability='Unavailable',
            rating=4.7,
            efficiency_rating=89.0,
            portfolio_url='https://davidkim.cloud'
        )
        f5 = Freelancer.objects.create(
            name='Emma Watson',
            title='Junior Frontend Builder',
            bio='Motivated junior developer eager to build highly interactive visual client applications. Fast learner with strong foundations in semantic HTML, clean CSS, and modern React design.',
            skills=json.dumps(["HTML", "CSS", "JavaScript", "React"]),
            wage_amount=40.00,
            wage_basis='Hourly',
            experience_years=1,
            availability='Immediate',
            rating=5.0,
            efficiency_rating=90.0,
            portfolio_url=''
        )

        self.stdout.write('Seeding past work milestones...')
        PastWork.objects.create(
            freelancer=f1,
            project_name='Google Analytics Redesign',
            client_company='Google Inc.',
            duration='3 Months',
            description='Rewrote core client-facing dashboards to use modern React charts, reducing loading latency by 45%.',
            project_efficiency=98
        )
        PastWork.objects.create(
            freelancer=f1,
            project_name='Fintech SaaS Portal',
            client_company='Apex Finance',
            duration='2 Months',
            description='Constructed secure multi-tenant client portals with live state updates and glassmorphic UI components.',
            project_efficiency=97
        )
        PastWork.objects.create(
            freelancer=f2,
            project_name='Microservices API Migration',
            client_company='CloudCorp SaaS',
            duration='4 Months',
            description='Refactored a legacy API server monolith to lightweight scalable Node.js microservices.',
            project_efficiency=93
        )
        PastWork.objects.create(
            freelancer=f2,
            project_name='Realtime Payment Web Gateway',
            client_company='PaySwift',
            duration='3 Months',
            description='Engineered custom secure webhook handling pipelines for low-latency transaction routing.',
            project_efficiency=91
        )
        PastWork.objects.create(
            freelancer=f3,
            project_name='Creative Portfolio Builder UI',
            client_company='CreativeStudio',
            duration='2 Months',
            description='Designed and built accessible reusable HTML/CSS templates and Figma visual tokens.',
            project_efficiency=96
        )
        PastWork.objects.create(
            freelancer=f4,
            project_name='Serverless Event Pipeline',
            client_company='LogiTech Solutions',
            duration='6 Months',
            description='Architected serverless databases and Lambda functions processing 10M+ daily events.',
            project_efficiency=89
        )

        self.stdout.write('Seeding recruiters...')
        r1 = Recruiter.objects.create(
            name='Sarah Jenkins',
            company='Google',
            industry='Technology',
            bio='Lead Talent Scout for Developer Tooling and Core Infrastructure teams. Passionate about linking high-agency builders with complex problems.'
        )
        r2 = Recruiter.objects.create(
            name='Michael Vance',
            company='TechCorp Inc.',
            industry='E-commerce & SaaS',
            bio='Technical Product Manager looking for quick-turnaround software engineers to ship innovative MVP web apps.'
        )

        self.stdout.write('Seeding user credentials profiles...')
        # Profile user credentials
        UserProfile.objects.create(username='alice', password='alice123', role='freelancer', profile_id=f1.id)
        UserProfile.objects.create(username='bob', password='bob123', role='freelancer', profile_id=f2.id)
        UserProfile.objects.create(username='clara', password='clara123', role='freelancer', profile_id=f3.id)
        UserProfile.objects.create(username='david', password='david123', role='freelancer', profile_id=f4.id)
        UserProfile.objects.create(username='emma', password='emma123', role='freelancer', profile_id=f5.id)
        UserProfile.objects.create(username='sarah', password='sarah123', role='recruiter', profile_id=r1.id)
        UserProfile.objects.create(username='michael', password='michael123', role='recruiter', profile_id=r2.id)

        self.stdout.write('Seeding job requirements...')
        Job.objects.create(
            title='React Frontend Expert',
            description='Looking for an advanced React developer to lead the rewrite of our dashboard using high-fidelity glassmorphism themes, responsive charts, and custom layouts.',
            budget=90.00,
            required_skills=json.dumps(["React", "CSS", "JavaScript"]),
            duration='3 Months',
            recruiter=r1
        )
        Job.objects.create(
            title='Scalable Node.js Backend API Developer',
            description='Need a senior engineer to optimize our Express-based API backend and design migrations for our relational databases.',
            budget=80.00,
            required_skills=json.dumps(["Node.js", "Express", "SQL"]),
            duration='6 Months',
            recruiter=r2
        )
        Job.objects.create(
            title='Fullstack Cloud Web Creator',
            description='Looking for a fullstack developer with AWS and TypeScript experience to build a secure SaaS client portal from scratch.',
            budget=120.00,
            required_skills=json.dumps(["React", "Node.js", "TypeScript", "SQL"]),
            duration='2 Months',
            recruiter=r1
        )

        self.stdout.write('Seeding chat messages...')
        # Seeding messages
        m1 = Message.objects.create(
            sender_id=r1.id, sender_role='recruiter',
            receiver_id=f1.id, receiver_role='freelancer',
            content='Hi Alice, I saw your past Google Analytics project and 98% efficiency rating. We have a position for a React Frontend Expert at Google. Are you free to chat?'
        )
        m1.timestamp = timezone.now() - timedelta(hours=2)
        m1.save()

        m2 = Message.objects.create(
            sender_id=f1.id, sender_role='freelancer',
            receiver_id=r1.id, receiver_role='recruiter',
            content='Hi Sarah! Yes, I am absolutely interested. Dashboard optimization is one of my specialties. What details can you share?'
        )
        m2.timestamp = timezone.now() - timedelta(hours=1)
        m2.save()

        m3 = Message.objects.create(
            sender_id=r1.id, sender_role='recruiter',
            receiver_id=f1.id, receiver_role='freelancer',
            content='Fantastic! It is a 3-month contract, fully remote. Let me send over the specifications.'
        )
        m3.timestamp = timezone.now() - timedelta(minutes=45)
        m3.save()

        m4 = Message.objects.create(
            sender_id=r2.id, sender_role='recruiter',
            receiver_id=f2.id, receiver_role='freelancer',
            content='Hey Bob, we are looking for someone to optimize our Express API. Your profile fits our backend stack perfectly.'
        )
        m4.timestamp = timezone.now() - timedelta(minutes=10)
        m4.save()

        self.stdout.write(self.style.SUCCESS('SkillConnect Django database seeded successfully.'))
