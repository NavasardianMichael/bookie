# Bookie Database Structure & Types

## Overview

The Bookie platform is a healthcare booking system that connects consumers (patients) with healthcare providers and organizations. The database structure includes several entities with well-defined relationships.

## Core Entities

### 1. Consumer

- **Purpose**: Represents patients/clients who book appointments
- **Key Properties**: Basic info (name, phone), favorite providers
- **Relationships**:
  - Many appointments
  - Many reviews
  - Many favorite providers

### 2. Provider

- **Purpose**: Healthcare professionals offering services
- **Key Properties**: Personal info, specialty category, services offered
- **Relationships**:
  - Many appointments
  - Many reviews
  - Optional organization affiliation
  - Many services

### 3. Organization

- **Purpose**: Healthcare facilities/clinics/hospitals
- **Key Properties**: Company info, contact details, category
- **Relationships**:
  - Many providers
  - Many appointments (through providers)
  - Many reviews

### 4. Appointment

- **Purpose**: Scheduled bookings between consumers and providers
- **Key Properties**: Time slot, status, notes
- **Relationships**:
  - One consumer
  - One provider
  - One service
  - Optional organization
  - Possible review (after completion)

### 5. Review

- **Purpose**: Feedback and ratings from consumers
- **Key Properties**: Rating (1-5), comment, timestamps
- **Relationships**:
  - One consumer
  - Either provider OR organization (or both)

## Entity Relationships

```
Consumer ←→ Appointment ←→ Provider
    ↓           ↓           ↓
  Review ←→ [Service] ←→ Organization
    ↑                       ↑
    └─────── Review ←────────┘
```

### Key Relationships:

1. **Consumer ↔ Provider**: Many-to-Many through Appointments
2. **Provider ↔ Organization**: Many-to-One (optional)
3. **Consumer → Review**: One-to-Many
4. **Provider → Review**: One-to-Many
5. **Organization → Review**: One-to-Many
6. **Appointment → Service**: Many-to-One

## Type Structure

### Base Types

- `Consumer`: Core consumer entity
- `Provider`: Core provider entity
- `Organization`: Core organization entity
- `Appointment`: Booking entity with status tracking
- `Review`: Rating and feedback entity

### Extended Types

- `ConsumerWithRelations`: Consumer + relationship IDs
- `ProviderWithRelations`: Provider + availability, stats
- `OrganizationWithRelations`: Organization + provider count, stats
- `AppointmentWithDetails`: Appointment + populated related entities
- `ReviewWithDetails`: Review + populated related entities

### Utility Types

- `BasicXXX`: Minimal entity data for listings
- `XXXRelations`: Relationship mappings for each entity
- `EntityStats`: Statistics for analytics
- `PlatformStats`: Overall platform metrics

## Mock Data

The mock database includes:

- **4 Consumers**: Diverse set of patients
- **15 Providers**: Various healthcare specialties
- **8 Organizations**: Different types of healthcare facilities
- **5 Appointments**: Different statuses and time slots
- **5 Reviews**: Mix of provider and organization reviews

## File Structure

```
src/
├── api/_shared/
│   ├── db.ts              # Mock database with sample data
│   └── db.types.ts        # Database type definitions
├── interfaces/
│   ├── appointments.ts    # Appointment-related types
│   ├── reviews.ts         # Review and rating types
│   └── relationships.ts   # Utility types for relationships
└── store/
    ├── consumers/profile/types.ts    # Consumer types
    ├── providers/profile/types.ts    # Provider types
    └── organizations/single/types.ts # Organization types
```

## Usage Examples

### Fetching Related Data

```typescript
// Get consumer with appointments
const consumer = await getConsumerWithAppointments(consumerId)

// Get provider with reviews and stats
const provider = await getProviderWithStats(providerId)

// Get organization with all providers
const org = await getOrganizationWithProviders(orgId)
```

### Creating Relationships

```typescript
// Book an appointment
const appointment = await createAppointment({
  consumerId: '1',
  providerId: '2',
  serviceId: 'service-3',
  time: { startDate: '2025-07-25T09:00:00Z', ... }
})

// Leave a review
const review = await createReview({
  consumerId: '1',
  providerId: '2',
  rating: 5,
  comment: 'Excellent service!'
})
```

## Benefits of This Structure

1. **Type Safety**: All relationships are strongly typed
2. **Flexibility**: Supports various booking scenarios
3. **Scalability**: Easy to add new entities and relationships
4. **Analytics**: Built-in support for statistics and metrics
5. **Consistency**: Standardized patterns across all entities
6. **Performance**: Optimized for common query patterns

This structure provides a solid foundation for a healthcare booking platform with room for future enhancements like notifications, billing, medical records, and more.
