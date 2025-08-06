import { DBType } from './db.types'
import { organizations } from './organizations'
import { organizationToBasic } from '../helpers/processors'

export const providers: DBType['providers'] = [
  {
    id: '1',
    basic: {
      categories: [],
      firstName: 'John',
      lastName: 'Doe',
      image: 'https://randomuser.me/api/portraits/men/1.jpg',
      organization: organizationToBasic(organizations[0]),
    },
    details: {
      phone: '+1234567890',
      country: 'United States',
      location: {
        address: '123 Main St, New York, NY 10001',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'john.doe@example.com',
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
      categories: [{ id: 'cat-2', name: 'Physical Therapy', organizations: [], providers: [] }],
      firstName: 'Jane',
      lastName: 'Smith',
      image: 'https://randomuser.me/api/portraits/women/2.jpg',
    },
    details: {
      phone: '+1234567891',
      country: 'United States',
      location: {
        address: '789 Oak St, Los Angeles, CA 90210',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-3', name: 'Mental Health', organizations: [], providers: [] }],
      firstName: 'Alice',
      lastName: 'Johnson',
      image: 'https://randomuser.me/api/portraits/women/3.jpg',
      organization: {
        id: 'org-2',
        basic: {
          name: 'WellnessCenter Toronto',
          categories: [{ id: 'cat-3', name: 'Mental Health', organizations: [], providers: [] }],
          description:
            'A leading mental health facility in Toronto offering comprehensive counseling, therapy, and wellness services to support mental and emotional well-being.',
        },
      },
    },
    details: {
      phone: '+1234567892',
      country: 'Canada',
      location: {
        address: '321 Maple Ave, Toronto, ON M5V 3A8',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'alice.johnson@example.com',
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
      categories: [{ id: 'cat-4', name: 'Dentistry', organizations: [], providers: [] }],
      firstName: 'Bob',
      lastName: 'Williams',
      image: 'https://randomuser.me/api/portraits/men/4.jpg',
    },
    details: {
      phone: '+1234567893',
      country: 'United States',
      location: {
        address: '555 Pine St, Chicago, IL 60601',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-5', name: 'Cardiology', organizations: [], providers: [] }],
      firstName: 'Carol',
      lastName: 'Brown',
      image: 'https://randomuser.me/api/portraits/women/5.jpg',
      organization: {
        id: 'org-3',
        basic: {
          name: 'London Medical Group',
          categories: [{ id: 'cat-5', name: 'Cardiology', organizations: [], providers: [] }],
          description:
            'Premier cardiovascular care center in London, specializing in advanced heart treatments and preventive cardiac medicine with state-of-the-art facilities.',
        },
      },
    },
    details: {
      phone: '+1234567894',
      country: 'United Kingdom',
      location: {
        address: '777 London Rd, London, SW1A 1AA',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'carol.brown@example.com',
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
      categories: [{ id: 'cat-6', name: 'Dermatology', organizations: [], providers: [] }],
      firstName: 'David',
      lastName: 'Jones',
      image: 'https://randomuser.me/api/portraits/men/6.jpg',
    },
    details: {
      phone: '+1234567895',
      country: 'Australia',
      location: {
        address: '999 Sydney Ave, Sydney, NSW 2000',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-7', name: 'Pediatrics', organizations: [], providers: [] }],
      firstName: 'Eve',
      lastName: 'Garcia',
      image: 'https://randomuser.me/api/portraits/women/7.jpg',
      organization: {
        id: 'org-4',
        basic: {
          name: 'Centro Médico Madrid',
          categories: [{ id: 'cat-7', name: 'Pediatrics', organizations: [], providers: [] }],
          description:
            'Specialized pediatric medical center in Madrid providing comprehensive child healthcare services with experienced pediatricians and modern facilities.',
        },
      },
    },
    details: {
      phone: '+1234567896',
      country: 'Spain',
      location: {
        address: '111 Madrid St, Madrid, 28001',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'eve.garcia@example.com',
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
      categories: [{ id: 'cat-8', name: 'Emergency Medicine', organizations: [], providers: [] }],
      firstName: 'Frank',
      lastName: 'Martinez',
      image: 'https://randomuser.me/api/portraits/men/8.jpg',
    },
    details: {
      phone: '+1234567897',
      country: 'Mexico',
      location: {
        address: '333 Mexico City Blvd, Mexico City, 01000',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-9', name: 'Ophthalmology', organizations: [], providers: [] }],
      firstName: 'Grace',
      lastName: 'Lee',
      image: 'https://randomuser.me/api/portraits/women/9.jpg',
      organization: {
        id: 'org-5',
        basic: {
          name: 'Seoul Health Center',
          categories: [{ id: 'cat-9', name: 'Ophthalmology', organizations: [], providers: [] }],
          description:
            'Advanced eye care center in Seoul offering comprehensive ophthalmology services including LASIK surgery and cutting-edge vision correction treatments.',
        },
      },
    },
    details: {
      phone: '+1234567898',
      country: 'South Korea',
      location: {
        address: '444 Seoul St, Seoul, 04522',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'grace.lee@example.com',
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
      categories: [{ id: 'cat-10', name: 'Orthopedics', organizations: [], providers: [] }],
      firstName: 'Henry',
      lastName: 'Perez',
      image: 'https://randomuser.me/api/portraits/men/10.jpg',
    },
    details: {
      phone: '+1234567899',
      country: 'Brazil',
      location: {
        address: '666 São Paulo Ave, São Paulo, 01310-100',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-11', name: 'Neurology', organizations: [], providers: [] }],
      firstName: 'Ivy',
      lastName: 'White',
      image: 'https://randomuser.me/api/portraits/women/11.jpg',
      organization: {
        id: 'org-6',
        basic: {
          name: 'Berlin Medical Institute',
          categories: [{ id: 'cat-11', name: 'Neurology', organizations: [], providers: [] }],
          description:
            'Leading neurological research and treatment institute in Berlin, specializing in brain and nervous system disorders with innovative therapeutic approaches.',
        },
      },
    },
    details: {
      phone: '+1234567800',
      country: 'Germany',
      location: {
        address: '777 Berlin St, Berlin, 10115',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'ivy.white@example.com',
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
      categories: [{ id: 'cat-12', name: 'Gastroenterology', organizations: [], providers: [] }],
      firstName: 'Jack',
      lastName: 'Harris',
      image: 'https://randomuser.me/api/portraits/men/12.jpg',
    },
    details: {
      phone: '+1234567801',
      country: 'France',
      location: {
        address: '999 Paris Blvd, Paris, 75001',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-13', name: 'Gynecology', organizations: [], providers: [] }],
      firstName: 'Kathy',
      lastName: 'Clark',
      image: 'https://randomuser.me/api/portraits/women/13.jpg',
      organization: {
        id: 'org-7',
        basic: {
          name: 'Roma Medical Center',
          categories: [{ id: 'cat-13', name: 'Gynecology', organizations: [], providers: [] }],
          description:
            "Comprehensive women's health center in Rome providing specialized gynecological services, reproductive health care, and wellness programs for women of all ages.",
        },
      },
    },
    details: {
      phone: '+1234567802',
      country: 'Italy',
      location: {
        address: '101 Rome Ave, Rome, 00100',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'kathy.clark@example.com',
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
      categories: [{ id: 'cat-14', name: 'Oncology', organizations: [], providers: [] }],
      firstName: 'Leo',
      lastName: 'Lewis',
      image: 'https://randomuser.me/api/portraits/men/14.jpg',
    },
    details: {
      phone: '+1234567803',
      country: 'Japan',
      location: {
        address: '303 Tokyo St, Tokyo, 100-0001',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
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
      categories: [{ id: 'cat-15', name: 'Pulmonology', organizations: [], providers: [] }],
      firstName: 'Mona',
      lastName: 'Walker',
      image: 'https://randomuser.me/api/portraits/women/15.jpg',
      organization: {
        id: 'org-8',
        basic: {
          name: 'Amsterdam Health Network',
          categories: [{ id: 'cat-15', name: 'Pulmonology', organizations: [], providers: [] }],
          description:
            'Specialized respiratory care network in Amsterdam offering advanced pulmonology services, lung health assessments, and comprehensive treatment for respiratory conditions.',
        },
      },
    },
    details: {
      phone: '+1234567804',
      country: 'Netherlands',
      location: {
        address: '404 Amsterdam Ave, Amsterdam, 1012',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'mona.walker@example.com',
    },
    services: [
      {
        id: 'service-22',
        name: 'Pulmonology',
        description: 'Lung and respiratory health services',
      },
    ],
  },
]
