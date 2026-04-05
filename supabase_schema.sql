-- Pharmacy Management System Schema - PostgreSQL (Supabase)
-- Strictly adhering to the provided ER Diagram

CREATE TABLE MEDICINE (
  medicine_id        SERIAL PRIMARY KEY,
  name               VARCHAR(100) NOT NULL,
  category           VARCHAR(50),
  batch_number       VARCHAR(50),
  expiry_date        DATE NOT NULL,
  price              DECIMAL(10, 2) NOT NULL,
  available_quantity INT DEFAULT 0,
  min_threshold      INT DEFAULT 50,
  requires_prescription BOOLEAN DEFAULT FALSE
);

-- M to N recursive relationship IS_SUBSTITUTE for MEDICINE
CREATE TABLE IS_SUBSTITUTE (
  medicine_id            INT NOT NULL,
  substitute_medicine_id INT NOT NULL,
  PRIMARY KEY (medicine_id, substitute_medicine_id),
  FOREIGN KEY (medicine_id) REFERENCES MEDICINE(medicine_id),
  FOREIGN KEY (substitute_medicine_id) REFERENCES MEDICINE(medicine_id)
);

CREATE TABLE EMPLOYEE (
  employee_id      SERIAL PRIMARY KEY,
  Fname            VARCHAR(50) NOT NULL,
  Minit            CHAR(1),
  Lname            VARCHAR(50) NOT NULL,
  email            VARCHAR(100) UNIQUE NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  gender           VARCHAR(10),
  date_of_joining  DATE,
  salary           DECIMAL(10, 2),
  supervisor_id    INT,
  FOREIGN KEY (supervisor_id) REFERENCES EMPLOYEE(employee_id)
);

-- 1 to 1 HAS_ADDRESS weak entity mapping
CREATE TABLE ADDRESS (
  employee_id      INT PRIMARY KEY,
  street           VARCHAR(100),
  state            VARCHAR(50),
  city             VARCHAR(50),
  zip              VARCHAR(20),
  FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id) ON DELETE CASCADE
);

CREATE TABLE CUSTOMER (
  customer_id      SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  phone_number     VARCHAR(20),
  address          TEXT
);

CREATE TABLE SALES (
  sale_id          SERIAL PRIMARY KEY,
  sale_date        DATE NOT NULL,
  Total_amount     DECIMAL(10, 2) NOT NULL,
  customer_id      INT NOT NULL,
  employee_id      INT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES CUSTOMER(customer_id),
  FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id)
);

-- M to N INCLUDES relation mapping SALES and MEDICINE
CREATE TABLE INCLUDES (
  sale_id          INT NOT NULL,
  medicine_id      INT NOT NULL,
  quantity         INT NOT NULL,
  PRIMARY KEY (sale_id, medicine_id),
  FOREIGN KEY (sale_id) REFERENCES SALES(sale_id),
  FOREIGN KEY (medicine_id) REFERENCES MEDICINE(medicine_id)
);

CREATE TABLE SUPPLIER (
  supplier_id      SERIAL PRIMARY KEY,
  Name             VARCHAR(100) NOT NULL,
  Contact_number   VARCHAR(20),
  Address          TEXT
);

CREATE TABLE PURCHASE (
  purchase_id      SERIAL PRIMARY KEY,
  purchase_date    DATE NOT NULL,
  purchase_price   DECIMAL(10, 2) NOT NULL,
  supplier_id      INT NOT NULL,
  employee_id      INT NOT NULL,
  FOREIGN KEY (supplier_id) REFERENCES SUPPLIER(supplier_id),
  FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(employee_id)
);

-- M to N CONTAINS relation mapping PURCHASE and MEDICINE
CREATE TABLE PURCHASE_CONTAINS (
  purchase_id      INT NOT NULL,
  medicine_id      INT NOT NULL,
  quantity         INT NOT NULL,
  PRIMARY KEY (purchase_id, medicine_id),
  FOREIGN KEY (purchase_id) REFERENCES PURCHASE(purchase_id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES MEDICINE(medicine_id)
);

CREATE TABLE PRESCRIPTION (
  prescription_id SERIAL PRIMARY KEY,
  doctor_name VARCHAR(100) NOT NULL,
  place VARCHAR(100),
  prescription_number VARCHAR(50),
  prescription_date DATE NOT NULL,
  sale_id INT NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES SALES(sale_id) ON DELETE CASCADE
);

-- ==============================================================================
-- DATABASE TRIGGERS (AUTOMATED INVENTORY MANAGEMENT)
-- ==============================================================================

-- 1. Trigger to deduct stock automatically when a sale (INCLUDES) occurs
CREATE OR REPLACE FUNCTION deduct_stock_on_sale() 
RETURNS TRIGGER AS $$
BEGIN
   UPDATE medicine
   SET available_quantity = available_quantity - NEW.quantity
   WHERE medicine_id = NEW.medicine_id;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_sale_insert
AFTER INSERT ON includes
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_sale();

-- 2. Trigger to add stock automatically when a purchase (restock) occurs
CREATE OR REPLACE FUNCTION add_stock_on_purchase() 
RETURNS TRIGGER AS $$
BEGIN
   UPDATE medicine
   SET available_quantity = available_quantity + NEW.quantity
   WHERE medicine_id = NEW.medicine_id;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_purchase_insert
AFTER INSERT ON purchase_contains
FOR EACH ROW
EXECUTE FUNCTION add_stock_on_purchase();
