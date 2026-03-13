CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    client VARCHAR(255),
    completion_year YEAR,
    project_status VARCHAR(50),
    main_featured_image VARCHAR(255),
    category_id INT,
    featured TINYINT(1) DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE project_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    image_path VARCHAR(255),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
