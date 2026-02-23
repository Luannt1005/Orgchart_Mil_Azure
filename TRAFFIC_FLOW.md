# Traffic Flow Analysis

This document details the traffic flow across the entire OrgChart application, visualizing how requests move from the client to the server, database, and external services.

## 1. Global System Traffic Map

This diagram represents the high-level movement of data and requests across the application infrastructure.

```mermaid
graph TD
    %% Nodes
    User(("👤 User / Browser"))
    
    subgraph "Next.js Application Server"
        MW[("🛡️ Middleware<br/>(Edge/Node)")]
        
        subgraph "Client Layer (Frontend)"
            Pages["📄 React Pages<br/>(Next.js App Router)"]
            SWR["🔄 SWR <br/>(Data Fetching)"]
        end
        
        subgraph "API Layer (Backend)"
            LoginAPI["🔑 /api/login"]
            OrgAPI["📊 /api/orgchart"]
            SheetAPI["📝 /api/sheet"]
            ImportAPI["📂 /api/import_excel"]
            UploadAPI["📤 /api/upload-image"]
            
            AuthService["🔐 Auth Service<br/>(JWT Verify)"]
            CacheService["⚡ Memory Cache"]
            Transform["⚙️ Data Transformer"]
        end
    end

    AzureDB[("🛢️ Azure SQL Database<br/>(Primary Data)")]
    Supabase[("☁️ Supabase Storage<br/>(Public Images)")]

    %% Flows
    User -->|HTTPS Request| MW
    
    %% Middleware Routing
    MW -- "No Auth Cookie" --> LoginRedirect["⛔ Redirect /login"]
    MW -- "Valid Cookie" --> Pages
    MW -- "Valid Cookie" --> API_Routes["Pass to API Routes"]
    
    %% Client Side
    Pages -->|User Interaction| SWR
    SWR -->|Async Fetch| API_Routes
    
    %% API Routing
    API_Routes -.-> LoginAPI
    API_Routes -.-> OrgAPI
    API_Routes -.-> SheetAPI
    API_Routes -.-> ImportAPI
    API_Routes -.-> UploadAPI
    
    %% Services Logic
    LoginAPI -->|Verify Creds| AzureDB
    LoginAPI -->|Issue JWT| User
    
    OrgAPI --> AuthService
    OrgAPI -->|Check| CacheService
    
    CacheService -- "Hit" --> OrgAPI
    CacheService -- "Miss" --> QueryDB["🔍 Query Employees"]
    
    QueryDB --> AzureDB
    AzureDB -->|Raw Rows| Transform
    Transform -->|Formatted JSON| CacheService
    
    %% Image Traffic
    Transform -.->|Gen URL| User
    User -.->|Direct Image Fetch| Supabase
    
    %% Write Operations
    SheetAPI -->|Update| AzureDB
    ImportAPI -->|Bulk Insert| AzureDB
    UploadAPI -->|Upload File| Supabase
```

## 2. Detailed Request Sequences

### Scenario A: Full Page Load (Org Chart) & Data Fetching

This flow shows what happens when a user visits the main Org Chart page.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Browser
    participant Middleware
    participant Page as Next.js Page
    participant API as /api/orgchart
    participant DB as Azure SQL
    participant Cache as Memory Cache
    participant Supabase as Supabase Storage

    User->>Browser: Navigate to /org-chart
    Browser->>Middleware: GET /org-chart (Cookie: auth=JWT)
    
    alt Invalid/No Cookie
        Middleware-->>Browser: 307 Redirect to /login
    else Valid Cookie
        Middleware->>Page: Allow Request
        Page-->>Browser: Return HTML/JS Bundle
    end
    
    activate Browser
    Note right of Browser: Client hydrates,<br/>SWR initiates fetch
    Browser->>API: GET /api/orgchart?dept=all
    
    API->>API: Verify JWT (Auth Service)
    
    API->>Cache: Check Key: 'orgchart_direct_all'
    
    alt Cache HIT
        Cache-->>API: Return Cached JSON
    else Cache MISS
        API->>DB: SELECT * FROM employees
        DB-->>API: Return Recordset
        API->>API: Transform Data (Tree Structure)
        API->>API: Generate Image URLs
        API->>Cache: Store for 15mins
    end
    
    API-->>Browser: Return JSON (300ms-1s)
    
    Browser->>Browser: Render Chart Nodes
    
    par Load Images
        Browser->>Supabase: GET /storage/v1/object/public/.../ID.webp
        Supabase-->>Browser: Return Image File
    end
    deactivate Browser
```

### Scenario B: Authentication (Login)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant LoginUI as Login Page
    participant API as /api/login
    participant DB as Azure SQL

    User->>LoginUI: Enter Username/Pass
    LoginUI->>API: POST {username, password}
    
    API->>DB: SELECT * FROM users WHERE username=@u
    DB-->>API: Returns User Row + Hash
    
    API->>API: bcrypt.compare(password, hash)
    
    alt Invalid
        API-->>LoginUI: 401 Unauthorized
        LoginUI-->>User: Show Error Message
    else Valid
        API->>API: Sign JWT (uid, role)
        API-->>LoginUI: 200 OK + Set-Cookie (HttpOnly)
        LoginUI->>User: Redirect to Dashboard
    end
```

### Scenario C: Data Modification (Edit Employee)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Sheet Editor UI
    participant API as /api/sheet [PUT]
    participant AuthService as Auth Service
    participant DB as Azure SQL
    participant Cache as Memory Cache

    User->>UI: Click Edit, Modify Fields
    UI->>API: PUT /api/sheet {id, data}
    
    API->>AuthService: Verify JWT
    
    alt Unauthorized
        API-->>UI: 401 Unauthorized
    else Authorized
        API->>API: Build Dynamic SET clause
        API->>DB: UPDATE employees SET ... WHERE id=@id
        DB-->>API: Success (rowsAffected)
        
        API->>Cache: Invalidate 'employees*'
        API->>Cache: Invalidate 'orgchart*'
        
        API-->>UI: 200 OK {success: true}
        UI->>UI: Trigger SWR revalidation
        UI-->>User: Show Success Notification
    end
```

### Scenario D: Excel Import (Bulk Operation)

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Import UI
    participant API as /api/import_excel
    participant XLSX as xlsx Library
    participant DB as Azure SQL
    participant Cache as Memory Cache

    Admin->>UI: Select Excel File, Click Upload
    UI->>API: POST /api/import_excel (FormData)
    
    API->>API: Parse FormData, Get File Buffer
    API->>XLSX: XLSX.read(buffer)
    XLSX-->>API: Workbook Object
    
    API->>XLSX: sheet_to_json()
    XLSX-->>API: Array of Rows (JSON)
    
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT id, emp_id FROM employees
    DB-->>API: Existing Employee IDs Map
    
    API->>API: Compare New vs Existing IDs
    
    loop For Each Row
        API->>API: Parse Row Fields
        alt Employee Exists (Emp ID Match)
            API->>DB: UPDATE employees SET ... WHERE id=@id
        else New Employee
            API->>DB: INSERT INTO employees (...)
        end
    end
    
    alt Employees Removed from File
        API->>DB: DELETE FROM employees WHERE id IN (...)
    end
    
    API->>DB: COMMIT TRANSACTION
    API->>Cache: Invalidate 'employees*'
    API->>Cache: Invalidate 'orgchart*'
    
    API-->>UI: 200 OK {saved, deleted, total}
    UI-->>Admin: Show Success Summary
    
    Note over API,DB: Transaction ensures<br/>all-or-nothing import
```

### Scenario E: Image Upload (Profile Picture)

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Upload Form
    participant API as /api/upload-image
    participant Supabase as Supabase Storage

    User->>UI: Select Image File
    UI->>API: POST /api/upload-image (FormData)
    
    API->>API: Verify JWT
    API->>API: Parse file (Buffer)
    API->>API: Validate file type/size
    
    alt Invalid File
        API-->>UI: 400 Bad Request
    else Valid File
        API->>Supabase: Upload to bucket 'Mil VN Images/uploads/'
        Supabase-->>API: Public URL
        
        API-->>UI: 200 OK {url}
        UI->>UI: Update Image Preview
        UI-->>User: Show Uploaded Image
    end
    
    Note over Supabase: Images served directly<br/>to client via public URLs
```

## 3. Cache Strategy & Invalidation

The application uses an in-memory cache to reduce database load. Here's how cache invalidation flows work:

```mermaid
flowchart TD
    WriteOp["✏️ Write Operation<br/>(POST/PUT/DELETE)"]
    
    WriteOp --> SheetAPI["/api/sheet"]
    WriteOp --> ImportAPI["/api/import_excel"]
    WriteOp --> OrgChartSave["/api/orgcharts [POST/PUT]"]
    
    SheetAPI --> InvalidateEmp["Invalidate 'employees*'"]
    SheetAPI --> InvalidateOrg["Invalidate 'orgchart*'"]
    
    ImportAPI --> InvalidateEmp
    ImportAPI --> InvalidateOrg
    
    OrgChartSave --> InvalidateCustom["Invalidate 'custom_orgchart_{id}'"]
    
    InvalidateEmp --> NextRead["📖 Next GET Request"]
    InvalidateOrg --> NextRead
    InvalidateCustom --> NextRead
    
    NextRead --> CacheMiss["❌ Cache MISS"]
    CacheMiss --> FreshQuery["🔄 Fresh DB Query"]
    FreshQuery --> Populate["✅ Populate Cache"]
    Populate --> Return["Return Fresh Data"]
```

## 4. Error Handling Paths

### Database Connection Failure

```mermaid
flowchart LR
    Request["API Request"] --> GetConn["getDbConnection()"]
    GetConn --> CheckPool["Pool Connected?"]
    
    CheckPool -- Yes --> UsePool["Return Existing Pool"]
    CheckPool -- No --> Reconnect["Attempt Reconnect"]
    
    Reconnect --> Success["✅ Connected"]
    Reconnect --> Failure["❌ Connection Failed"]
    
    Failure --> LogError["Log Error + Config"]
    LogError --> Throw["Throw Error"]
    Throw --> APIError["500 Internal Server Error"]
    
    Success --> UsePool
    UsePool --> Proceed["Continue Request"]
```

### Authentication Failure

```mermaid
flowchart TD
    Request["Incoming API Request"] --> Middleware["Middleware Check"]
    
    Middleware --> HasCookie{"Has 'auth' Cookie?"}
    HasCookie -- No --> RedirectLogin["↩️ Redirect to /login"]
    HasCookie -- Yes --> APIRoute["Route to API"]
    
    APIRoute --> Verify["isAuthenticated()"]
    Verify --> Decrypt["decrypt(JWT)"]
    
    Decrypt --> Valid{"Valid Token?"}
    Valid -- No --> Return401["❌ 401 Unauthorized"]
    Valid -- Yes --> ProcessRequest["✅ Process Request"]
```

## 5. Key Data Transformation Points

### Flat to Hierarchical (OrgChart)

The `/api/orgchart` endpoint performs complex data transformation:

```mermaid
flowchart TD
    Raw["📊 Raw SQL Rows<br/>(employees table)"] --> Parse["Parse Each Employee"]
    
    Parse --> ExtractManager["Extract line_manager<br/>(format: 'ID: Name')"]
    ExtractManager --> TrimZeros["Trim Leading Zeros"]
    
    TrimZeros --> CheckIndirect{"is_direct = 'NO'?"}
    
    CheckIndirect -- Yes --> IndirectNode["Create as Indirect<br/>managerId = 'i-{id}'"]
    CheckIndirect -- No --> DirectNode["Create as Direct<br/>managerId = {id}"]
    
    IndirectNode --> CreateDept["Create Department Node"]
    DirectNode --> CreateDept
    
    CreateDept --> AssignParent["Assign Parent<br/>(pid = managerId or Dept)"]
    
    AssignParent --> FormatDates["Format Dates<br/>(Excel Serial → DD/MM/YYYY)"]
    FormatDates --> GenImageURL["Generate Image URLs<br/>(Supabase Storage)"]
    
    GenImageURL --> AddTags["Add Tags<br/>(probation, headcount, etc)"]
    AddTags --> Output["🌲 Hierarchical JSON<br/>(OrgChart.js compatible)"]
```

## 6. Admin Approval Workflow

For line manager change requests:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Employee Form
    participant API as /api/sheet [PUT]
    participant DB as Azure SQL
    actor Admin
    participant AdminUI as Admin Panel

    User->>UI: Change Line Manager
    UI->>API: PUT {pendingLineManager, lineManagerStatus: 'pending', requester}
    API->>DB: UPDATE employees SET pending_line_manager=..., line_manager_status='pending'
    DB-->>API: Success
    API-->>UI: 200 OK
    
    Note over UI,DB: Original line_manager<br/>remains unchanged
    
    Admin->>AdminUI: Open Pending Requests
    AdminUI->>API: GET /api/sheet?lineManagerStatus=pending
    API->>DB: SELECT * WHERE line_manager_status='pending'
    DB-->>AdminUI: Return Pending Rows
    
    alt Approve
        Admin->>AdminUI: Click Approve
        AdminUI->>API: POST /api/sheet {action: 'approveAll'}
        API->>DB: UPDATE employees SET<br/>line_manager=pending_line_manager,<br/>line_manager_status='approved',<br/>pending_line_manager=NULL
        DB-->>API: Success
        API-->>AdminUI: Approved {count}
    else Reject
        Admin->>AdminUI: Click Reject
        AdminUI->>API: POST /api/sheet {action: 'rejectAll'}
        API->>DB: UPDATE employees SET<br/>line_manager_status='rejected',<br/>pending_line_manager=NULL
        DB-->>API: Success
        API-->>AdminUI: Rejected {count}
    end
```

## 7. Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14+ (App Router) | SSR, Routing, React Components |
| **State Management** | SWR | Data fetching, caching, revalidation |
| **Styling** | Tailwind CSS | Utility-first styling |
| **API Layer** | Next.js API Routes | Serverless backend functions |
| **Database** | Azure SQL Database | Primary data storage (employees, users, departments) |
| **ORM/Client** | `mssql` (node-mssql) | Direct SQL queries to Azure SQL |
| **Authentication** | Custom JWT + HttpOnly Cookies | Session management |
| **Storage** | Supabase Storage | Public image/avatar hosting |
| **Visualization** | OrgChart.js | Interactive org chart rendering |
| **Excel Processing** | `xlsx` library | Import/export employee data |
| **Cache** | In-memory Map | App-level caching (15min TTL) |

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-11  
**Author**: System Analysis
