const inquirer = require('inquirer');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'rootroot',
    host: 'localhost',
    database: 'employees_db'
});

console.log(`Connected to the employees_db database.`);

async function mainMenu() {
    const answer = await inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'What would you like to do?',
        choices: [
            'View All Departments',
            'View All Roles',
            'View All Employees',
            'Add a Department',
            'Add a Role',
            'Add an Employee',
            'Update an Employee Role',
            'Update Employee Salary',
            'Delete an Employee',
            'Exit'
        ]
    });

    switch (answer.action) {
        case 'View All Departments':
            viewDepartments();
            break;
        case 'View All Roles':
            viewRoles();
            break;
        case 'View All Employees':
            viewEmployees();
            break;
        case 'Add a Department':
            addDepartment();
            break;
        case 'Add a Role':
            addRole();
            break;
        case 'Add an Employee':
            addEmployee();
            break;
        case 'Update an Employee Role':
            updateEmployeeRole();
            break;
        case 'Update Employee Salary':
            updateEmployeeSalary();
            break;
        case 'Delete an Employee':
            deleteEmployee();
            break;
        case 'Exit':
            console.log('Goodbye!');
            process.exit();
    }
}

async function viewDepartments() {
    const sql = 'SELECT id, department_name AS department FROM department';
    const res = await pool.query(sql);
    console.table(res.rows);
    mainMenu();
}

async function viewRoles() {
    const sql = `SELECT role.id, role.title, department.department_name AS department, role.salary 
                 FROM role 
                 JOIN department ON role.department_id = department.id`;
    const res = await pool.query(sql);
    console.table(res.rows);
    mainMenu();
}

async function viewEmployees() {
  const sql = `SELECT employee.id, employee.first_name, employee.last_name, 
                      role.title, department.department_name AS department, role.salary, 
                      CONCAT(manager.first_name, ' ', manager.last_name) AS manager 
               FROM employee 
               JOIN role ON employee.role_id = role.id
               JOIN department ON role.department_id = department.id
               LEFT JOIN employee manager ON employee.manager_id = manager.id`;
  const res = await pool.query(sql);
  console.table(res.rows);
  mainMenu();
}

async function addDepartment() {
    const answer = await inquirer.prompt({
        name: 'name',
        type: 'input',
        message: 'Enter the name of the department:'
    });

    const sql = 'INSERT INTO department (department_name) VALUES ($1)';
    const res = await pool.query(sql, [answer.name]);
    console.log('Department added!');
    mainMenu();
}

async function addRole() {
    const departments = await pool.query('SELECT id, department_name FROM department');
    const departmentChoices = departments.rows.map(dept => ({
        name: dept.department_name,
        value: dept.id
    }));

    const answer = await inquirer.prompt([
        {
            name: 'title',
            type: 'input',
            message: 'Enter the title of the role:'
        },
        {
            name: 'salary',
            type: 'input',
            message: 'Enter the salary for the role:',
            validate: value => !isNaN(parseFloat(value)) || "Please enter a number."
        },
        {
            name: 'departmentId',
            type: 'list',
            message: 'Which department does the role belong to?',
            choices: departmentChoices
        }
    ]);

    const sql = 'INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)';
    const res = await pool.query(sql, [answer.title, answer.salary, answer.departmentId]);
    console.log('Role added!');
    mainMenu();
}
async function addEmployee() {
  const roles = await pool.query('SELECT id, title FROM role');
  const roleChoices = roles.rows.map(role => ({
      name: role.title,
      value: role.id
  }));

  const managers = await pool.query('SELECT id, first_name, last_name FROM employee'); // Updated table name here
  const managerChoices = [{ name: 'None', value: null }].concat(managers.rows.map(mgr => ({
      name: `${mgr.first_name} ${mgr.last_name}`,
      value: mgr.id
  })));

  const answers = await inquirer.prompt([
      {
          name: 'firstName',
          type: 'input',
          message: 'Enter the first name of the employee:'
      },
      {
          name: 'lastName',
          type: 'input',
          message: 'Enter the last name of the employee:'
      },
      {
          name: 'roleId',
          type: 'list',
          message: 'Select the role of the employee:',
          choices: roleChoices
      },
      {
          name: 'managerId',
          type: 'list',
          message: 'Select the manager for the employee:',
          choices: managerChoices
      }
  ]);

  const sql = 'INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)'; // Updated table name here
  const res = await pool.query(sql, [answers.firstName, answers.lastName, answers.roleId, answers.managerId]);
  if (res.rowCount > 0) {
      console.log('Employee added successfully!');
  } else {
      console.log('Failed to add employee.');
  }
  mainMenu();
}

async function updateEmployeeRole() {
  const employees = await pool.query('SELECT id, first_name, last_name FROM employees');
  const employeeChoices = employees.rows.map(emp => ({
      name: `${emp.first_name} ${emp.last_name}`,
      value: emp.id
  }));

  const roles = await pool.query('SELECT id, title FROM role');
  const roleChoices = roles.rows.map(role => ({
      name: role.title,
      value: role.id
  }));

  const answers = await inquirer.prompt([
      {
          name: 'employeeId',
          type: 'list',
          message: 'Which employee\'s role do you want to update?',
          choices: employeeChoices
      },
      {
          name: 'roleId',
          type: 'list',
          message: 'What is the new role?',
          choices: roleChoices
      }
  ]);

  const sql = 'UPDATE employees SET role_id = $1 WHERE id = $2';
  const res = await pool.query(sql, [answers.roleId, answers.employeeId]);
  if (res.rowCount > 0) {
      console.log('Employee role updated successfully!');
  } else {
      console.log('Failed to update employee role.');
  }
  mainMenu();
}

async function updateEmployeeSalary() {
  const employees = await pool.query('SELECT id, first_name, last_name, role_id FROM employee');
  const employeeChoices = employees.rows.map(emp => ({
      name: `${emp.first_name} ${emp.last_name}`,
      value: emp.id
  }));

  const answers = await inquirer.prompt([
      {
          name: 'employeeId',
          type: 'list',
          message: 'Which employee\'s salary do you want to update?',
          choices: employeeChoices
      },
      {
          name: 'newSalary',
          type: 'input',
          message: 'Enter the new salary:',
          validate: value => !isNaN(parseFloat(value)) && parseFloat(value) > 0 || "Please enter a valid number greater than 0."
      }
  ]);

  const sql = 'UPDATE role SET salary = $1 WHERE id = (SELECT role_id FROM employee WHERE id = $2)';
  const res = await pool.query(sql, [answers.newSalary, answers.employeeId]);
  if (res.rowCount > 0) {
      console.log('Employee salary updated successfully!');
  } else {
      console.log('Failed to update employee salary.');
  }
  mainMenu();
}

async function deleteEmployee() {
  const employees = await pool.query('SELECT id, first_name, last_name FROM employee');
  const employeeChoices = employees.rows.map(emp => ({
      name: `${emp.first_name} ${emp.last_name}`,
      value: emp.id
  }));

  const answer = await inquirer.prompt([
      {
          name: 'employeeId',
          type: 'list',
          message: 'Select the employee you want to delete:',
          choices: employeeChoices
      },
      {
          name: 'confirm',
          type: 'confirm',
          message: 'Are you sure you want to delete this employee?'
      }
  ]);

  if (answer.confirm) {
      const sql = 'DELETE FROM employee WHERE id = $1';
      const res = await pool.query(sql, [answer.employeeId]);
      if (res.rowCount > 0) {
          console.log('Employee deleted successfully!');
      } else {
          console.log('Failed to delete employee.');
      }
  } else {
      console.log('Employee deletion cancelled.');
  }
  mainMenu();
}

mainMenu();