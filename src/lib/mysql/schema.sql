-- Create database
CREATE DATABASE IF NOT EXISTS laci_db;
USE laci_db;

-- Create users table
CREATE TABLE users (
    id BINARY(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    first_logon DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_logon DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create applications table
CREATE TABLE applications (
    id BINARY(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    createdById BINARY(16) NOT NULL,
    modifiedById BINARY(16) NOT NULL,
    hitCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME ON UPDATE CURRENT_TIMESTAMP,
    enabled BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (createdById) REFERENCES users(id),
    FOREIGN KEY (modifiedById) REFERENCES users(id)
);

-- Create categories table
CREATE TABLE categories (
    id BINARY(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    `order` INTEGER NOT NULL
);

-- Create fields table
CREATE TABLE fields (
    id BINARY(16) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    `order` INTEGER NOT NULL
);

-- Create entries table
CREATE TABLE entries (
    id BINARY(16) PRIMARY KEY,
    applicationId BINARY(16) NOT NULL,
    categoryId BINARY(16) NOT NULL,
    fieldId BINARY(16) NOT NULL,
    createdById BINARY(16) NOT NULL,
    modifiedById BINARY(16) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME ON UPDATE CURRENT_TIMESTAMP,
    assignedUsers JSON,
    FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES categories(id),
    FOREIGN KEY (fieldId) REFERENCES fields(id),
    FOREIGN KEY (createdById) REFERENCES users(id),
    FOREIGN KEY (modifiedById) REFERENCES users(id),
    UNIQUE KEY uc_app_category_field (applicationId, categoryId, fieldId)
);

-- Create audit log table
CREATE TABLE audit (
    id BINARY(16) PRIMARY KEY,
    actor BINARY(16) NOT NULL,
    action ENUM('add', 'change', 'delete', 'login', 'logout') NOT NULL,
    target ENUM('application', 'category', 'field', 'entry', 'system') NOT NULL,
    targetId BINARY(16),
    changes JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor) REFERENCES users(id)
);

-- Create approvals table
CREATE TABLE approvals (
    id BINARY(16) PRIMARY KEY,
    applicationId BINARY(16) NOT NULL,
    approverId BINARY(16) NOT NULL,
    approvedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (applicationId) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (approverId) REFERENCES users(id),
    UNIQUE KEY unique_active_approval (applicationId)
);

-- Add approvers table after the approvals table
CREATE TABLE approvers (
    id BINARY(16) PRIMARY KEY,
    type ENUM('user', 'group') NOT NULL,
    displayName VARCHAR(255) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdById BINARY(16) NOT NULL,
    FOREIGN KEY (createdById) REFERENCES users(id),
    UNIQUE KEY unique_approver (type, identifier)
);

-- Insert initial categories
INSERT INTO categories (id, name, `order`) VALUES
(UUID_TO_BIN(UUID()), 'Application', 0),
(UUID_TO_BIN(UUID()), 'Billing', 1),
(UUID_TO_BIN(UUID()), 'Database', 2),
(UUID_TO_BIN(UUID()), 'Infrastructure', 3),
(UUID_TO_BIN(UUID()), 'Licensing', 4),
(UUID_TO_BIN(UUID()), 'Network', 5),
(UUID_TO_BIN(UUID()), 'Operating System', 6),
(UUID_TO_BIN(UUID()), 'Security', 7),
(UUID_TO_BIN(UUID()), 'User Access', 8),
(UUID_TO_BIN(UUID()), 'User Support', 9);

-- Insert initial fields
INSERT INTO fields (id, name, `order`) VALUES
(UUID_TO_BIN(UUID()), 'Laborer', 0),
(UUID_TO_BIN(UUID()), 'Accountable', 1),
(UUID_TO_BIN(UUID()), 'Consulted', 2),
(UUID_TO_BIN(UUID()), 'Informed', 3);

-- Database User
CREATE USER 'laci_user'@'%' IDENTIFIED BY 'laci_password';

-- Grants
GRANT ALL PRIVILEGES ON laci_db.* TO 'laci_user'@'%';

-- Add this function to the schema.sql file
DELIMITER //

CREATE PROCEDURE get_audit_logs_after_id(IN last_id BINARY(16), IN days INT)
BEGIN
    SELECT id, actor, action, target, targetId, timestamp
    FROM audit
    WHERE (last_id IS NULL OR id > last_id)
      AND (days IS NULL OR timestamp >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL days DAY))
    ORDER BY timestamp DESC;
END //

DELIMITER ;
