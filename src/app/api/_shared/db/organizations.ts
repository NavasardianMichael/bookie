import { DBType } from './db.types'

export const organizations: DBType['organizations'] = [
  {
    id: 'org-1',
    basic: {
      name: 'HealthCare Plus',
      categories: [
        { id: 'cat-2', name: 'Physical Therapy', organizations: [], providers: [] },
        { id: 'cat-3', name: 'Mental Health', organizations: [], providers: [] },
      ],
      description:
        'A comprehensive healthcare facility providing quality general medical services and preventive care to patients of all ages in the heart of New York.',
    },
    details: {
      phone: '+1234567890',
      country: 'United States',
      location: {
        address: '456 Medical Ave, New York, NY 10002',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'info@healthcareplus.com',
      website: 'https://healthcareplus.com',
      logoUrl: 'https://via.placeholder.com/150x150?text=HealthCare+Plus',
    },
  },
  {
    id: 'org-2',
    basic: {
      name: 'WellnessCenter Toronto',
      categories: [{ id: 'cat-3', name: 'Mental Health', organizations: [], providers: [] }],
      description:
        'A leading mental health facility in Toronto offering comprehensive counseling, therapy, and wellness services to support mental and emotional well-being.',
    },
    details: {
      phone: '+1416555123',
      country: 'Canada',
      location: {
        address: '654 Health Blvd, Toronto, ON M5V 2B9',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'contact@wellnesscenter.ca',
      website: 'https://wellnesscenter.ca',
      logoUrl: 'https://via.placeholder.com/150x150?text=WellnessCenter',
    },
  },
  {
    id: 'org-3',
    basic: {
      name: 'London Medical Group',
      categories: [{ id: 'cat-5', name: 'Cardiology', organizations: [], providers: [] }],
      description:
        'Premier cardiovascular care center in London, specializing in advanced heart treatments and preventive cardiac medicine with state-of-the-art facilities.',
    },
    details: {
      phone: '+442071234567',
      country: 'United Kingdom',
      location: {
        address: '888 Healthcare St, London, SW1A 2BB',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'info@londonmedical.co.uk',
      website: 'https://londonmedical.co.uk',
      logoUrl: 'https://via.placeholder.com/150x150?text=London+Medical',
    },
  },
  {
    id: 'org-4',
    basic: {
      name: 'Centro Médico Madrid',
      categories: [{ id: 'cat-7', name: 'Pediatrics', organizations: [], providers: [] }],
      description:
        'Specialized pediatric medical center in Madrid providing comprehensive child healthcare services with experienced pediatricians and modern facilities.',
    },
    details: {
      phone: '+34911234567',
      country: 'Spain',
      location: {
        address: '222 Salud Ave, Madrid, 28002',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'info@centromedicomadrid.es',
      website: 'https://centromedicomadrid.es',
      logoUrl: 'https://via.placeholder.com/150x150?text=Centro+Madrid',
    },
  },
  {
    id: 'org-5',
    basic: {
      name: 'Seoul Health Center',
      categories: [{ id: 'cat-9', name: 'Ophthalmology', organizations: [], providers: [] }],
      description:
        'Advanced eye care center in Seoul offering comprehensive ophthalmology services including LASIK surgery and cutting-edge vision correction treatments.',
    },
    details: {
      phone: '+82212345678',
      country: 'South Korea',
      location: {
        address: '555 Gangnam Ave, Seoul, 06000',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'info@seoulhealth.kr',
      website: 'https://seoulhealth.kr',
      logoUrl: 'https://via.placeholder.com/150x150?text=Seoul+Health',
    },
  },
  {
    id: 'org-6',
    basic: {
      name: 'Berlin Medical Institute',
      categories: [{ id: 'cat-11', name: 'Neurology', organizations: [], providers: [] }],
      description:
        'Leading neurological research and treatment institute in Berlin, specializing in brain and nervous system disorders with innovative therapeutic approaches.',
    },
    details: {
      phone: '+493012345678',
      country: 'Germany',
      location: {
        address: '888 Medical Plaza, Berlin, 10117',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'kontakt@berlinmedical.de',
      website: 'https://berlinmedical.de',
      logoUrl: 'https://via.placeholder.com/150x150?text=Berlin+Medical',
    },
  },
  {
    id: 'org-7',
    basic: {
      name: 'Roma Medical Center',
      categories: [{ id: 'cat-13', name: 'Gynecology', organizations: [], providers: [] }],
      description:
        "Comprehensive women's health center in Rome providing specialized gynecological services, reproductive health care, and wellness programs for women of all ages.",
    },
    details: {
      phone: '+390612345678',
      country: 'Italy',
      location: {
        address: '202 Vatican St, Rome, 00120',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'info@romamedical.it',
      website: 'https://romamedical.it',
      logoUrl: 'https://via.placeholder.com/150x150?text=Roma+Medical',
    },
  },
  {
    id: 'org-8',
    basic: {
      name: 'Amsterdam Health Network',
      categories: [{ id: 'cat-15', name: 'Pulmonology', organizations: [], providers: [] }],
      description:
        'Specialized respiratory care network in Amsterdam offering advanced pulmonology services, lung health assessments, and comprehensive treatment for respiratory conditions.',
    },
    details: {
      phone: '+31201234567',
      country: 'Netherlands',
      location: {
        address: '505 Canal St, Amsterdam, 1017',
        url: 'https://maps.app.goo.gl/KWULuyYevsEf1Qq29',
      },
      email: 'info@amsterdamhealth.nl',
      website: 'https://amsterdamhealth.nl',
      logoUrl: 'https://via.placeholder.com/150x150?text=Amsterdam+Health',
    },
  },
]
