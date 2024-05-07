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
            'View (Departments, Roles, Employees)',
            'Add (Department, Role, Employee)',
            'Update an Employee (Department, Role, Salary)',
            'Delete (Department, Role, Employee)',
            'Exit'
        ]
    });

    switch (answer.action) {
        case 'View (Departments, Roles, Employees)':
            viewMenu();
            break;
        case 'Add (Department, Role, Employee)':
            addMenu();
            break;
        case 'Update an Employee (Department, Role, Salary)':
            updateEmployeeMenu();
            break;
        case 'Delete (Department, Role, Employee)':
            deleteMenu();
            break;
        case 'Exit':
            console.log('Goodbye!');
            process.exit();
            break;
    }
}

async function viewMenu() {
    const answer = await inquirer.prompt({
        name: 'viewOption',
        type: 'list',
        message: 'What would you like to view?',
        choices: [
            'View All Departments',
            'View All Roles',
            'View All Employees',
            'Go Back'
        ]
    });

    switch (answer.viewOption) {
        case 'View All Departments':
            viewDepartments();
            break;
        case 'View All Roles':
            viewRoles();
            break;
        case 'View All Employees':
            viewEmployees();
            break;
        case 'Go Back':
            mainMenu();
            break;
    }
}

async function addMenu() {
    const answer = await inquirer.prompt({
        name: 'addOption',
        type: 'list',
        message: 'What would you like to add?',
        choices: [
            'Add a Department',
            'Add a Role',
            'Add an Employee',
            'Go Back'
        ]
    });

    switch (answer.addOption) {
        case 'Add a Department':
            addDepartment();
            break;
        case 'Add a Role':
            addRole();
            break;
        case 'Add an Employee':
            addEmployee();
            break;
        case 'Go Back':
            mainMenu();
            break;
    }
}

async function viewDepartments() {
    const sql = `
        SELECT department.id, 
               department.department_name AS "Department",
               COALESCE(SUM(role.salary), 0) AS "Total Utilized Budget"
        FROM department
        LEFT JOIN role ON department.id = role.department_id
        LEFT JOIN employee ON role.id = employee.role_id
        GROUP BY department.id, department.department_name
        ORDER BY department.id`;
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
        message: 'Enter const rame of const repartment:'
    });

    const existingDepartment = await pool.query('SELECT * FROM department WHERE department_name = $1', [answer.name]);
    if (existingDepartment.rows.length > 0) {
        console.log(`Department named "${answer.name}" already exists.`);
    } else {
        const sql = 'INSERT INTO department (department_name) VALUES ($1)';
        const res = await pool.query(sql, [answer.name]);
        console.log(res.rowCount > 0 ? 'Department added!' : 'Failed to add department.');
    }
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
            message: 'Enter const ritle of const role:'
        },
        {
            name: 'salary',
            type: 'input',
            message: 'Enter const ralary for const role:',
            validate: value => !isNaN(parseFloat(value)) || "Please enter a number."
        },
        {
            name: 'departmentId',
            type: 'list',
            message: 'Which department does const role belong to?',
            choices: departmentChoices
        }
    ]);

    const existingRole = await pool.query('SELECT * FROM role WHERE title = $1', [answer.title]);
    if (existingRole.rows.length > 0) {
        console.log(`Role titled "${answer.title}" already exists.`);
    } else {
        const sql = 'INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)';
        const res = await pool.query(sql, [answer.title, answer.salary, answer.departmentId]);
        console.log(res.rowCount > 0 ? 'Role added!' : 'Failed to add role.');
    }
    mainMenu();
}

async function addEmployee() {
    const roles = await pool.query('SELECT id, title FROM role');
    const roleChoices = roles.rows.map(role => ({
        name: role.title,
        value: role.id
    }));

    const managers = await pool.query('SELECT id, first_name, last_name FROM employee');
    const managerChoices = [{ name: 'None', value: null }].concat(managers.rows.map(mgr => ({
        name: `${mgr.first_name} ${mgr.last_name}`,
        value: mgr.id
    })));

    const answers = await inquirer.prompt([
        {
            name: 'firstName',
            type: 'input',
            message: 'Enter const rirst name of const rmployee:'
        },
        {
            name: 'lastName',
            type: 'input',
            message: 'Enter const rast name of const rmployee:'
        },
        {
            name: 'roleId',
            type: 'list',
            message: 'Select const role of const rmployee:',
            choices: roleChoices
        },
        {
            name: 'managerId',
            type: 'list',
            message: 'Select const ranager for const rmployee:',
            choices: managerChoices
        }
    ]);

    const existingEmployee = await pool.query('SELECT * FROM employee WHERE first_name = $1 AND last_name = $2', [answers.firstName, answers.lastName]);
    if (existingEmployee.rows.length > 0) {
        console.log(`Employee named "${answers.firstName} ${answers.lastName}" already exists.`);
    } else {
        const sql = 'INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES ($1, $2, $3, $4)';
        const res = await pool.query(sql, [answers.firstName, answers.lastName, answers.roleId, answers.managerId]);
        console.log(res.rowCount > 0 ? 'Employee added successfully!' : 'Failed to add employee.');
    }
    mainMenu();
}

async function updateEmployeeMenu() {
  const employees = await pool.query('SELECT id, first_name, last_name FROM employee');
  const employeeChoices = employees.rows.map(emp => ({
      name: `${emp.first_name} ${emp.last_name}`,
      value: emp.id
  }));

  const answer = await inquirer.prompt([
      {
          name: 'employeeId',
          type: 'list',
          message: 'Select const rmployee you want to update:',
          choices: employeeChoices
      },
      {
          name: 'updateOption',
          type: 'list',
          message: 'What would you like to update for this employee?',
          choices: [
              'Department',
              'Role',
              'Salary',
              'Go Back'
          ]
      }
  ]);

  switch (answer.updateOption) {
      case 'Department':
          updateEmployeeDepartment(answer.employeeId);
          break;
      case 'Role':
          updateEmployeeRole(answer.employeeId);
          break;
      case 'Salary':
          updateEmployeeSalary(answer.employeeId);
          break;
      case 'Go Back':
          mainMenu();
          break;
  }
}

async function updateEmployeeRole(employeeId) {
  const roles = await pool.query('SELECT id, title FROM role');
  const roleChoices = roles.rows.map(role => ({
      name: role.title,
      value: role.id
  }));

  const answer = await inquirer.prompt([
      {
          name: 'roleId',
          type: 'list',
          message: 'Select const rew role for const rmployee:',
          choices: roleChoices
      }
  ]);

  const sql = 'UPDATE employee SET role_id = $1 WHERE id = $2';
  const res = await pool.query(sql, [answer.roleId, employeeId]);
  console.log(res.rowCount > 0 ? 'Employee role updated successfully!' : 'Failed to update employee role.');
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
            message: 'Enter const rew salary:',
            validate: value => !isNaN(parseFloat(value)) && parseFloat(value) > 0 || "Please enter a valid number greater than 0."
        }
    ]);

    const sql = 'UPDATE role SET salary = $1 WHERE id = (SELECT role_id FROM employee WHERE id = $2)';
    const res = await pool.query(sql, [answers.newSalary, answers.employeeId]);
    console.log(res.rowCount > 0 ? 'Employee salary updated successfully!' : 'Failed to update employee salary.');
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
            message: 'Select const rmployee you want to delete:',
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
        console.log(res.rowCount > 0 ? 'Employee deleted successfully!' : 'Failed to delete employee.');
    } else {
        console.log('Employee deletion cancelled.');
    }
    mainMenu();
}

async function deleteRole() {
    const roles = await pool.query('SELECT id, title FROM role');
    const roleChoices = roles.rows.map(role => ({
        name: role.title,
        value: role.id
    }));

    const answer = await inquirer.prompt([
        {
            name: 'roleId',
            type: 'list',
            message: 'Select const role you want to delete:',
            choices: roleChoices
        },
        {
            name: 'confirm',
            type: 'confirm',
            message: 'Are you sure you want to delete this role? This will also remove all associated employees from this role.'
        }
    ]);

    if (answer.confirm) {
        // Check for employees assigned to this role
        const employees = await pool.query('SELECT id FROM employee WHERE role_id = $1', [answer.roleId]);
        if (employees.rows.length > 0) {
            console.log('Cannot delete role because const r are employees assigned to it. Please reassign const rmployees first.');
        } else {
            const sql = 'DELETE FROM role WHERE id = $1';
            const res = await pool.query(sql, [answer.roleId]);
            console.log(res.rowCount > 0 ? 'Role deleted successfully!' : 'Failed to delete role.');
        }
    } else {
        console.log('Role deletion cancelled.');
    }
    mainMenu();
}

async function deleteMenu() {
    const answer = await inquirer.prompt({
        name: 'deleteOption',
        type: 'list',
        message: 'What would you like to delete?',
        choices: [
            'Delete a Department',
            'Delete a Role',
            'Delete an Employee',
            'Go Back'
        ]
    });

    switch (answer.deleteOption) {
        case 'Delete a Department':
            deleteDepartment();
            break;
        case 'Delete a Role':
            deleteRole();
            break;
        case 'Delete an Employee':
            deleteEmployee();
            break;
        case 'Go Back':
            mainMenu();
            break;
    }
}

async function deleteDepartment() {
    const departments = await pool.query('SELECT id, department_name FROM department');
    const departmentChoices = departments.rows.map(dept => ({
        name: dept.department_name,
        value: dept.id
    }));

    const answer = await inquirer.prompt([
        {
            name: 'departmentId',
            type: 'list',
            message: 'Select const repartment you want to delete:',
            choices: departmentChoices
        },
        {
            name: 'confirm',
            type: 'confirm',
            message: 'Are you sure you want to delete this department and all associated roles?'
        }
    ]);

    if (answer.confirm) {
        // Check for roles associated with this department
        const roles = await pool.query('SELECT id FROM role WHERE department_id = $1', [answer.departmentId]);
        if (roles.rows.length > 0) {
            console.log('Cannot delete department because const r are roles assigned to it. Please delete const roles first.');
        } else {
            const sql = 'DELETE FROM department WHERE id = $1';
            const res = await pool.query(sql, [answer.departmentId]);
            console.log(res.rowCount > 0 ? 'Department deleted successfully!' : 'Failed to delete department.');
        }
    } else {
        console.log('Department deletion cancelled.');
    }
    mainMenu();
}

mainMenu();
