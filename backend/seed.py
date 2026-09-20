from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
import models
from security import hash_password


def seed_database(db: Session):
    # Seed Users if table is empty
    if db.query(models.User).count() == 0:
        admin_user = models.User(
            fullName="Admin User",
            email="admin@disaster.com",
            password=hash_password("admin123"),
            phoneNumber="+1234567890",
            role="ADMIN",
        )
        trainer_user = models.User(
            fullName="Dr. Sarah Johnson",
            email="trainer@disaster.com",
            password=hash_password("trainer123"),
            phoneNumber="+1234567891",
            role="TRAINER",
        )
        participant_user = models.User(
            fullName="John Doe",
            email="user@disaster.com",
            password=hash_password("user123"),
            phoneNumber="+1234567892",
            role="PARTICIPANT",
        )
        db.add_all([admin_user, trainer_user, participant_user])
        db.commit()

    # Seed Disasters if table is empty
    if db.query(models.Disaster).count() == 0:
        d1 = models.Disaster(
            disasterName="Urban Flash Flood",
            disasterType="Flood",
            district="Ernakulam",
            location="Kochi Marine Drive Zone",
            severity="HIGH",
            status="ACTIVE",
            description="Heavy monsoon downpour causing severe waterlogging and flash floods in low-lying coastal areas.",
            latitude=9.9312,
            longitude=76.2673,
        )
        d2 = models.Disaster(
            disasterName="Cyclone Alert Warning",
            disasterType="Cyclone",
            district="Chennai",
            location="Marina Beach Coastal Strip",
            severity="HIGH",
            status="ACTIVE",
            description="Tropical depression intensifying into a cyclonic storm with wind speeds gusting up to 90 km/h.",
            latitude=13.0827,
            longitude=80.2707,
        )
        d3 = models.Disaster(
            disasterName="Hillside Mudslide",
            disasterType="Landslide",
            district="Wayanad",
            location="Meppadi Mountain Range",
            severity="MEDIUM",
            status="ACTIVE",
            description="Slope instability triggered by continuous rain, blocking essential transport corridors.",
            latitude=11.6854,
            longitude=76.1320,
        )
        d4 = models.Disaster(
            disasterName="Dry Season Forest Fire",
            disasterType="Wildfire",
            district="Nilgiris",
            location="Mudumalai Buffer Zone",
            severity="LOW",
            status="RESOLVED",
            description="Brush fire contained by forestry rapid response teams before reaching residential sectors.",
            latitude=11.4102,
            longitude=76.6950,
        )
        db.add_all([d1, d2, d3, d4])
        db.commit()

    # Seed Training Centers & Programs if table is empty
    if db.query(models.TrainingCenter).count() == 0:
        c1 = models.TrainingCenter(
            centerName="National Disaster Response Academy",
            district="Chennai",
            address="104 Coastal Highway, Guindy",
            capacity=120,
            contactNumber="+91-44-2345678",
            coordinatorName="Capt. Rajesh Menon",
            status="Active",
            latitude=13.0067,
            longitude=80.2021,
        )
        c2 = models.TrainingCenter(
            centerName="Highland Mountain Rescue Hub",
            district="Wayanad",
            address="Sector 4, Hill Valley Road, Kalpetta",
            capacity=60,
            contactNumber="+91-4936-202345",
            coordinatorName="Dr. Anita Thomas",
            status="Active",
            latitude=11.6050,
            longitude=76.0828,
        )
        c3 = models.TrainingCenter(
            centerName="Metropolitan Emergency Operations Center",
            district="Ernakulam",
            address="Civil Station Annex, Kakkanad",
            capacity=150,
            contactNumber="+91-484-2422555",
            coordinatorName="K. S. Narayanan",
            status="Active",
            latitude=10.0159,
            longitude=76.3419,
        )
        db.add_all([c1, c2, c3])
        db.commit()
        db.refresh(c1)
        db.refresh(c2)
        db.refresh(c3)

        p1 = models.TrainingProgram(
            programName="Rapid Water Rescue & Swiftwater Ops",
            trainerName="Capt. Rajesh Menon",
            durationDays=5,
            startDate=date.today() + timedelta(days=2),
            endDate=date.today() + timedelta(days=7),
            maxParticipants=30,
            status="Active",
            description="Intensive field drill on watercraft handling, victim retrieval, and life-vest deployment.",
            trainingCenterId=c1.id,
        )
        p2 = models.TrainingProgram(
            programName="High Altitude Wilderness Trauma Care",
            trainerName="Dr. Sarah Johnson",
            durationDays=3,
            startDate=date.today() + timedelta(days=10),
            endDate=date.today() + timedelta(days=13),
            maxParticipants=25,
            status="Upcoming",
            description="Pre-hospital emergency triage, hypothermia treatment, and litter carry techniques in rugged terrain.",
            trainingCenterId=c2.id,
        )
        p3 = models.TrainingProgram(
            programName="Urban Emergency Incident Command (ICS-100)",
            trainerName="K. S. Narayanan",
            durationDays=4,
            startDate=date.today() - timedelta(days=14),
            endDate=date.today() - timedelta(days=10),
            maxParticipants=50,
            status="Completed",
            description="Command structure, inter-agency communication, and logistical coordination during major disasters.",
            trainingCenterId=c3.id,
        )
        db.add_all([p1, p2, p3])
        db.commit()

