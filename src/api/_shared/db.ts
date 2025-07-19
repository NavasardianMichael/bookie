import { DBType } from './db.types'

export const DB: DBType = {
  consumers: [
    {
      id: '1',
      basic: {
        name: 'Alice Johnson',
        phoneNumber: '+1234567890',
      },
      details: {
        favoriteProviders: [
          {
            id: '1',
            basic: {
              category: 'General Medicine',
              firstName: 'John',
              lastName: 'Doe',
              image: 'https://randomuser.me/api/portraits/men/1.jpg',
            },
          },
          {
            id: '3',
            basic: {
              category: 'Mental Health',
              firstName: 'Alice',
              lastName: 'Johnson',
              image: 'https://randomuser.me/api/portraits/women/3.jpg',
            },
          },
        ],
      },
    },
    {
      id: '2',
      basic: {
        name: 'Bob Smith',
        phoneNumber: '+1234567891',
      },
      details: {
        favoriteProviders: [
          {
            id: '2',
            basic: {
              category: 'Physical Therapy',
              firstName: 'Jane',
              lastName: 'Smith',
              image: 'https://randomuser.me/api/portraits/women/2.jpg',
            },
          },
        ],
      },
    },
    {
      id: '3',
      basic: {
        name: 'Carol Williams',
        phoneNumber: '+1234567892',
      },
      details: {
        favoriteProviders: [],
      },
    },
    {
      id: '4',
      basic: {
        name: 'David Brown',
        phoneNumber: '+1234567893',
      },
      details: {
        favoriteProviders: [
          {
            id: '4',
            basic: {
              category: 'Dentistry',
              firstName: 'Bob',
              lastName: 'Williams',
              image: 'https://randomuser.me/api/portraits/men/4.jpg',
            },
          },
          {
            id: '5',
            basic: {
              category: 'Cardiology',
              firstName: 'Carol',
              lastName: 'Brown',
              image: 'https://randomuser.me/api/portraits/women/5.jpg',
            },
          },
        ],
      },
    },
  ],
  providers: [
    {
      id: '1',
      basic: {
        category: 'General Medicine',
        firstName: 'John',
        lastName: 'Doe',
        image: 'https://randomuser.me/api/portraits/men/1.jpg',
      },
      details: {
        phone: '+1234567890',
        country: 'United States',
        address: '123 Main St, New York, NY 10001',
        email: 'john.doe@example.com',
        organization: {
          id: 'org-1',
          basic: {
            name: 'HealthCare Plus',
            category: 'General Medicine',
          },
        },
      },
      services: [
        {
          id: 'service-1',
          name: 'General Consultation',
          description: 'Comprehensive health checkup and consultation',
        },
        {
          id: 'service-2',
          name: 'Preventive Care',
          description: 'Regular health maintenance and prevention services',
        },
      ],
    },
    {
      id: '2',
      basic: {
        category: 'Physical Therapy',
        firstName: 'Jane',
        lastName: 'Smith',
        image: 'https://randomuser.me/api/portraits/women/2.jpg',
      },
      details: {
        phone: '+1234567891',
        country: 'United States',
        address: '789 Oak St, Los Angeles, CA 90210',
        email: 'jane.smith@example.com',
      },
      services: [
        {
          id: 'service-3',
          name: 'Physical Therapy',
          description: 'Rehabilitation and physical therapy services',
        },
      ],
    },
    {
      id: '3',
      basic: {
        category: 'Mental Health',
        firstName: 'Alice',
        lastName: 'Johnson',
        image: 'https://randomuser.me/api/portraits/women/3.jpg',
      },
      details: {
        phone: '+1234567892',
        country: 'Canada',
        address: '321 Maple Ave, Toronto, ON M5V 3A8',
        email: 'alice.johnson@example.com',
        organization: {
          id: 'org-2',
          basic: {
            name: 'WellnessCenter Toronto',
            category: 'Mental Health',
          },
        },
      },
      services: [
        {
          id: 'service-4',
          name: 'Mental Health Counseling',
          description: 'Professional mental health and wellness counseling',
        },
        {
          id: 'service-5',
          name: 'Stress Management',
          description: 'Stress reduction and management techniques',
        },
      ],
    },
    {
      id: '4',
      basic: {
        category: 'Dentistry',
        firstName: 'Bob',
        lastName: 'Williams',
        image: 'https://randomuser.me/api/portraits/men/4.jpg',
      },
      details: {
        phone: '+1234567893',
        country: 'United States',
        address: '555 Pine St, Chicago, IL 60601',
        email: 'bob.williams@example.com',
      },
      services: [
        {
          id: 'service-6',
          name: 'Dental Care',
          description: 'Comprehensive dental health services',
        },
        {
          id: 'service-7',
          name: 'Orthodontics',
          description: 'Teeth alignment and orthodontic treatments',
        },
      ],
    },
    {
      id: '5',
      basic: {
        category: 'Cardiology',
        firstName: 'Carol',
        lastName: 'Brown',
        image: 'https://randomuser.me/api/portraits/women/5.jpg',
      },
      details: {
        phone: '+1234567894',
        country: 'United Kingdom',
        address: '777 London Rd, London, SW1A 1AA',
        email: 'carol.brown@example.com',
        organization: {
          id: 'org-3',
          basic: {
            name: 'London Medical Group',
            category: 'Cardiology',
          },
        },
      },
      services: [
        {
          id: 'service-8',
          name: 'Cardiology',
          description: 'Heart health and cardiovascular care',
        },
      ],
    },
    {
      id: '6',
      basic: {
        category: 'Dermatology',
        firstName: 'David',
        lastName: 'Jones',
        image: 'https://randomuser.me/api/portraits/men/6.jpg',
      },
      details: {
        phone: '+1234567895',
        country: 'Australia',
        address: '999 Sydney Ave, Sydney, NSW 2000',
        email: 'david.jones@example.com',
      },
      services: [
        {
          id: 'service-9',
          name: 'Dermatology',
          description: 'Skin health and dermatological treatments',
        },
        {
          id: 'service-10',
          name: 'Cosmetic Procedures',
          description: 'Non-invasive cosmetic treatments',
        },
      ],
    },
    {
      id: '7',
      basic: {
        category: 'Pediatrics',
        firstName: 'Eve',
        lastName: 'Garcia',
        image: 'https://randomuser.me/api/portraits/women/7.jpg',
      },
      details: {
        phone: '+1234567896',
        country: 'Spain',
        address: '111 Madrid St, Madrid, 28001',
        email: 'eve.garcia@example.com',
        organization: {
          id: 'org-4',
          basic: {
            name: 'Centro Médico Madrid',
            category: 'Pediatrics',
          },
        },
      },
      services: [
        {
          id: 'service-11',
          name: 'Pediatrics',
          description: 'Child health and pediatric care',
        },
      ],
    },
    {
      id: '8',
      basic: {
        category: 'Emergency Medicine',
        firstName: 'Frank',
        lastName: 'Martinez',
        image: 'https://randomuser.me/api/portraits/men/8.jpg',
      },
      details: {
        phone: '+1234567897',
        country: 'Mexico',
        address: '333 Mexico City Blvd, Mexico City, 01000',
        email: 'frank.martinez@example.com',
      },
      services: [
        {
          id: 'service-12',
          name: 'Emergency Medicine',
          description: '24/7 emergency medical services',
        },
      ],
    },
    {
      id: '9',
      basic: {
        category: 'Ophthalmology',
        firstName: 'Grace',
        lastName: 'Lee',
        image: 'https://randomuser.me/api/portraits/women/9.jpg',
      },
      details: {
        phone: '+1234567898',
        country: 'South Korea',
        address: '444 Seoul St, Seoul, 04522',
        email: 'grace.lee@example.com',
        organization: {
          id: 'org-5',
          basic: {
            name: 'Seoul Health Center',
            category: 'Ophthalmology',
          },
        },
      },
      services: [
        {
          id: 'service-13',
          name: 'Ophthalmology',
          description: 'Eye care and vision health services',
        },
        {
          id: 'service-14',
          name: 'LASIK Surgery',
          description: 'Laser eye surgery and vision correction',
        },
      ],
    },
    {
      id: '10',
      basic: {
        category: 'Orthopedics',
        firstName: 'Henry',
        lastName: 'Perez',
        image: 'https://randomuser.me/api/portraits/men/10.jpg',
      },
      details: {
        phone: '+1234567899',
        country: 'Brazil',
        address: '666 São Paulo Ave, São Paulo, 01310-100',
        email: 'henry.perez@example.com',
      },
      services: [
        {
          id: 'service-15',
          name: 'Orthopedics',
          description: 'Bone and joint health services',
        },
      ],
    },
    {
      id: '11',
      basic: {
        category: 'Neurology',
        firstName: 'Ivy',
        lastName: 'White',
        image: 'https://randomuser.me/api/portraits/women/11.jpg',
      },
      details: {
        phone: '+1234567800',
        country: 'Germany',
        address: '777 Berlin St, Berlin, 10115',
        email: 'ivy.white@example.com',
        organization: {
          id: 'org-6',
          basic: {
            name: 'Berlin Medical Institute',
            category: 'Neurology',
          },
        },
      },
      services: [
        {
          id: 'service-16',
          name: 'Neurology',
          description: 'Brain and nervous system health',
        },
      ],
    },
    {
      id: '12',
      basic: {
        category: 'Gastroenterology',
        firstName: 'Jack',
        lastName: 'Harris',
        image: 'https://randomuser.me/api/portraits/men/12.jpg',
      },
      details: {
        phone: '+1234567801',
        country: 'France',
        address: '999 Paris Blvd, Paris, 75001',
        email: 'jack.harris@example.com',
      },
      services: [
        {
          id: 'service-17',
          name: 'Gastroenterology',
          description: 'Digestive system health and treatment',
        },
        {
          id: 'service-18',
          name: 'Endoscopy',
          description: 'Minimally invasive diagnostic procedures',
        },
      ],
    },
    {
      id: '13',
      basic: {
        category: 'Gynecology',
        firstName: 'Kathy',
        lastName: 'Clark',
        image: 'https://randomuser.me/api/portraits/women/13.jpg',
      },
      details: {
        phone: '+1234567802',
        country: 'Italy',
        address: '101 Rome Ave, Rome, 00100',
        email: 'kathy.clark@example.com',
        organization: {
          id: 'org-7',
          basic: {
            name: 'Roma Medical Center',
            category: 'Gynecology',
          },
        },
      },
      services: [
        {
          id: 'service-19',
          name: 'Gynecology',
          description: "Women's health and reproductive care",
        },
      ],
    },
    {
      id: '14',
      basic: {
        category: 'Oncology',
        firstName: 'Leo',
        lastName: 'Lewis',
        image: 'https://randomuser.me/api/portraits/men/14.jpg',
      },
      details: {
        phone: '+1234567803',
        country: 'Japan',
        address: '303 Tokyo St, Tokyo, 100-0001',
        email: 'leo.lewis@example.com',
      },
      services: [
        {
          id: 'service-20',
          name: 'Oncology',
          description: 'Cancer treatment and care',
        },
        {
          id: 'service-21',
          name: 'Radiation Therapy',
          description: 'Advanced cancer treatment options',
        },
      ],
    },
    {
      id: '15',
      basic: {
        category: 'Pulmonology',
        firstName: 'Mona',
        lastName: 'Walker',
        image: 'https://randomuser.me/api/portraits/women/15.jpg',
      },
      details: {
        phone: '+1234567804',
        country: 'Netherlands',
        address: '404 Amsterdam Ave, Amsterdam, 1012',
        email: 'mona.walker@example.com',
        organization: {
          id: 'org-8',
          basic: {
            name: 'Amsterdam Health Network',
            category: 'Pulmonology',
          },
        },
      },
      services: [
        {
          id: 'service-22',
          name: 'Pulmonology',
          description: 'Lung and respiratory health services',
        },
      ],
    },
  ],
  organizations: [
    {
      id: 'org-1',
      basic: {
        name: 'HealthCare Plus',
        category: 'General Medicine',
      },
      details: {
        phone: '+1234567890',
        country: 'United States',
        address: '456 Medical Ave, New York, NY 10002',
        email: 'info@healthcareplus.com',
        website: 'https://healthcareplus.com',
        logoUrl: 'https://via.placeholder.com/150x150?text=HealthCare+Plus',
      },
    },
    {
      id: 'org-2',
      basic: {
        name: 'WellnessCenter Toronto',
        category: 'Mental Health',
      },
      details: {
        phone: '+1416555123',
        country: 'Canada',
        address: '654 Health Blvd, Toronto, ON M5V 2B9',
        email: 'contact@wellnesscenter.ca',
        website: 'https://wellnesscenter.ca',
        logoUrl: 'https://via.placeholder.com/150x150?text=WellnessCenter',
      },
    },
    {
      id: 'org-3',
      basic: {
        name: 'London Medical Group',
        category: 'Cardiology',
      },
      details: {
        phone: '+442071234567',
        country: 'United Kingdom',
        address: '888 Healthcare St, London, SW1A 2BB',
        email: 'info@londonmedical.co.uk',
        website: 'https://londonmedical.co.uk',
        logoUrl: 'https://via.placeholder.com/150x150?text=London+Medical',
      },
    },
    {
      id: 'org-4',
      basic: {
        name: 'Centro Médico Madrid',
        category: 'Pediatrics',
      },
      details: {
        phone: '+34911234567',
        country: 'Spain',
        address: '222 Salud Ave, Madrid, 28002',
        email: 'info@centromedicomadrid.es',
        website: 'https://centromedicomadrid.es',
        logoUrl: 'https://via.placeholder.com/150x150?text=Centro+Madrid',
      },
    },
    {
      id: 'org-5',
      basic: {
        name: 'Seoul Health Center',
        category: 'Ophthalmology',
      },
      details: {
        phone: '+82212345678',
        country: 'South Korea',
        address: '555 Gangnam Ave, Seoul, 06000',
        email: 'info@seoulhealth.kr',
        website: 'https://seoulhealth.kr',
        logoUrl: 'https://via.placeholder.com/150x150?text=Seoul+Health',
      },
    },
    {
      id: 'org-6',
      basic: {
        name: 'Berlin Medical Institute',
        category: 'Neurology',
      },
      details: {
        phone: '+493012345678',
        country: 'Germany',
        address: '888 Medical Plaza, Berlin, 10117',
        email: 'kontakt@berlinmedical.de',
        website: 'https://berlinmedical.de',
        logoUrl: 'https://via.placeholder.com/150x150?text=Berlin+Medical',
      },
    },
    {
      id: 'org-7',
      basic: {
        name: 'Roma Medical Center',
        category: 'Gynecology',
      },
      details: {
        phone: '+390612345678',
        country: 'Italy',
        address: '202 Vatican St, Rome, 00120',
        email: 'info@romamedical.it',
        website: 'https://romamedical.it',
        logoUrl: 'https://via.placeholder.com/150x150?text=Roma+Medical',
      },
    },
    {
      id: 'org-8',
      basic: {
        name: 'Amsterdam Health Network',
        category: 'Pulmonology',
      },
      details: {
        phone: '+31201234567',
        country: 'Netherlands',
        address: '505 Canal St, Amsterdam, 1017',
        email: 'info@amsterdamhealth.nl',
        website: 'https://amsterdamhealth.nl',
        logoUrl: 'https://via.placeholder.com/150x150?text=Amsterdam+Health',
      },
    },
  ],
  appointments: [
    {
      id: 'appt-1',
      consumerId: '1',
      providerId: '1',
      serviceId: 'service-1',
      organizationId: 'org-1',
      time: {
        startDate: '2025-07-25T09:00:00.000Z',
        endDate: '2025-07-25T09:30:00.000Z',
        duration: 30,
      },
      status: 'scheduled',
      notes: 'Annual health checkup',
      createdAt: '2025-07-20T10:00:00.000Z',
      updatedAt: '2025-07-20T10:00:00.000Z',
    },
    {
      id: 'appt-2',
      consumerId: '2',
      providerId: '2',
      serviceId: 'service-3',
      time: {
        startDate: '2025-07-25T14:00:00.000Z',
        endDate: '2025-07-25T15:00:00.000Z',
        duration: 60,
      },
      status: 'confirmed',
      notes: 'Post-injury rehabilitation session',
      createdAt: '2025-07-19T15:30:00.000Z',
      updatedAt: '2025-07-20T08:00:00.000Z',
    },
    {
      id: 'appt-3',
      consumerId: '1',
      providerId: '3',
      serviceId: 'service-4',
      organizationId: 'org-2',
      time: {
        startDate: '2025-07-22T11:00:00.000Z',
        endDate: '2025-07-22T12:00:00.000Z',
        duration: 60,
      },
      status: 'completed',
      notes: 'Follow-up counseling session',
      createdAt: '2025-07-15T12:00:00.000Z',
      updatedAt: '2025-07-22T12:00:00.000Z',
    },
    {
      id: 'appt-4',
      consumerId: '4',
      providerId: '5',
      serviceId: 'service-8',
      organizationId: 'org-3',
      time: {
        startDate: '2025-07-24T16:00:00.000Z',
        endDate: '2025-07-24T16:45:00.000Z',
        duration: 45,
      },
      status: 'scheduled',
      notes: 'Cardiovascular health consultation',
      createdAt: '2025-07-18T09:30:00.000Z',
      updatedAt: '2025-07-18T09:30:00.000Z',
    },
    {
      id: 'appt-5',
      consumerId: '3',
      providerId: '4',
      serviceId: 'service-6',
      time: {
        startDate: '2025-07-23T08:30:00.000Z',
        endDate: '2025-07-23T09:30:00.000Z',
        duration: 60,
      },
      status: 'no-show',
      notes: 'Routine dental cleaning',
      createdAt: '2025-07-16T14:20:00.000Z',
      updatedAt: '2025-07-23T09:35:00.000Z',
    },
  ],
  getCodeByPhoneNumber: true,
  validatePhoneNumberCode: true,
}
