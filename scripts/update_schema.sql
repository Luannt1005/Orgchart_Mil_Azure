
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'is_public' AND Object_ID = Object_ID(N'custom_orgcharts'))
BEGIN
    ALTER TABLE custom_orgcharts
    ADD is_public BIT DEFAULT 0;
    PRINT 'Column is_public added successfully.';
END
ELSE
BEGIN
    PRINT 'Column is_public already exists.';
END
