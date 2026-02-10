
-- Run this script in your Azure SQL Database to create the necessary tables.

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='users' AND xtype='U')
BEGIN
    CREATE TABLE users (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(50) UNIQUE NOT NULL,
        password NVARCHAR(MAX) NOT NULL,
        full_name NVARCHAR(100) NOT NULL,
        role NVARCHAR(20) DEFAULT 'user',
        created_at DATETIME2 DEFAULT SYSDATETIME(),
        updated_at DATETIME2 DEFAULT SYSDATETIME()
    );
    CREATE INDEX idx_users_username ON users(username);
END;
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='employees' AND xtype='U')
BEGIN
    CREATE TABLE employees (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        emp_id NVARCHAR(20) UNIQUE NOT NULL,
        full_name NVARCHAR(200),
        job_title NVARCHAR(200),
        dept NVARCHAR(200),
        bu NVARCHAR(100),
        dl_idl_staff NVARCHAR(50),
        location NVARCHAR(200),
        employee_type NVARCHAR(100),
        line_manager NVARCHAR(200),
        joining_date NVARCHAR(50),
        raw_data NVARCHAR(MAX),
        imported_at DATETIME2 DEFAULT SYSDATETIME(),
        updated_at DATETIME2 DEFAULT SYSDATETIME()
    );
    CREATE INDEX idx_employees_emp_id ON employees(emp_id);
    CREATE INDEX idx_employees_dept ON employees(dept);
END;
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='orgchart_nodes' AND xtype='U')
BEGIN
    CREATE TABLE orgchart_nodes (
        id NVARCHAR(200) PRIMARY KEY,
        pid NVARCHAR(200),
        stpid NVARCHAR(200),
        name NVARCHAR(300),
        title NVARCHAR(200),
        image NVARCHAR(MAX),
        tags NVARCHAR(MAX),
        orig_pid NVARCHAR(200),
        dept NVARCHAR(200),
        bu NVARCHAR(100),
        type NVARCHAR(50),
        location NVARCHAR(200),
        description NVARCHAR(MAX),
        joining_date NVARCHAR(50),
        created_at DATETIME2 DEFAULT SYSDATETIME(),
        updated_at DATETIME2 DEFAULT SYSDATETIME()
    );
    CREATE INDEX idx_orgchart_nodes_pid ON orgchart_nodes(pid);
END;
GO

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='custom_orgcharts' AND xtype='U')
BEGIN
    CREATE TABLE custom_orgcharts (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(50) NOT NULL,
        orgchart_name NVARCHAR(200) NOT NULL,
        description NVARCHAR(MAX),
        org_data NVARCHAR(MAX),
        created_at DATETIME2 DEFAULT SYSDATETIME(),
        updated_at DATETIME2 DEFAULT SYSDATETIME()
    );
    CREATE INDEX idx_custom_orgcharts_username ON custom_orgcharts(username);
END;
GO
