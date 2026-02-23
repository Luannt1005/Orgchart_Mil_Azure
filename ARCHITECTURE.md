# System Architecture

## Overview
This document outlines the current system architecture for the OrgChart application. The system has migrated from a Supabase-centric backend to a custom implementation using **Azure SQL** for the core database and authentication, while retaining **Supabase Storage** for object storage (images).

## Architecture Diagram

```mermaid
graph TD
    User((User/Admin)) -->|HTTPS| UI[UI Shell / Next.js Client]
    
    subgraph Client [Client Application (Next.js)]
        UI --> AuthGuard[Auth Guard / Middleware]
        AuthGuard --> Modules
        subgraph Modules
            OC[Org Chart Module]
            Dash[Dashboard Module]
            Sheet[Sheet Data Module]
        end
        Modules -->|SWR / Fetch| DataLayer[Data Access Layer]
    end

    subgraph API [Next.js Server API]
        DataLayer -->|JSON| APIRoutes[API Routes]
        APIRoutes --> Logic[Business Logic Layer]
        
        subgraph Logic
            AuthMid[Auth Middleware <br/>(Custom JWT Cookie)]
            Transformer[Data Transformer]
            Cache[Memory Cache]
        end
        
        Logic -->|SQL Query| DB_Client[Azure SQL Client (mssql)]
        Logic -->|Upload/Read| Storage_Client[Supabase Client (Storage Only)]
    end

    subgraph Backend [Infrastructure]
        DB_Client -->|Read/Write| AzureDB[(Azure SQL Database)]
        Storage_Client -->|Store/Retrieve| SupabaseStorage[Supabase Object Storage <br/>(Images/Avatars)]
    end
    
    AzureDB -.->|Authentication Data| AuthMid
    SupabaseStorage -.->|Serve Images| UI
```

## Key Components

### 1. Client (Next.js Frontend)
- **Framework**: Next.js App Router.
- **UI Components**: Built with React, Tailwind CSS.
- **State Management**: SWR for data fetching and caching.
- **Authentication**: Cookie-based authentication using custom JWTs.

### 2. API Layer (Next.js Server)
- **API Routes**: Handle all client requests (`/api/*`).
- **Auth Middleware**: Verifies the `auth` cookie containing the JWT. Validates user sessions against the **Azure SQL** database (`users` table) if needed, or verifies the signed token.
- **Data Access**: Uses `mssql` library to communicate with Azure SQL.
- **Data Transformation**: Converts raw SQL recordsets into hierarchical structures (e.g., for Org Chart).

### 3. Backend Services
- **Azure SQL Database**: The primary source of truth.
  - Stores: `Employees`, `Users`, `Departments`, `OrgChart Configs`.
  - Replaces the previous Supabase Database.
- **Supabase Storage**:
  - Stores: Employee profile images and avatars.
  - Accessed via public URLs or signed URLs.
  - **Note**: This is the *only* Supabase service currently in use.

## Data Flow Changes

| Feature | Old Architecture (Supabase) | Current Architecture (Azure) |
| :--- | :--- | :--- |
| **Database** | Supabase (PostgreSQL) | **Azure SQL Database** |
| **Auth** | Supabase Auth | **Custom JWT + Azure SQL** |
| **API Logic** | Supabase Client (Client-side & Server-side) | **Next.js API Routes + mssql** |
| **Storage** | Supabase Storage | **Supabase Storage** (Unchanged) |

## Authentication Flow
1. **Login**: Client sends params to `/api/login`.
2. **Verification**: API checks credentials against `users` table in Azure SQL.
3. **Session**: On success, API signs a JWT and sets an HttpOnly `auth` cookie.
4. **Protection**: Middleware checks this cookie for protected routes.
