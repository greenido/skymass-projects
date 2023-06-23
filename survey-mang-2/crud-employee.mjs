import { SkyMass } from "@skymass/skymass";
import "dotenv/config";

import pgPromise from "pg-promise";

const db = await initDB();
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });


//
//
//
sm.page("/crud-testing", async (ui) => {
  const menu = ui.menubar({
    logo: {
      // text - if no src is specified
      text: "ACME",
  
      // optional image
      src: "https://www.wikicorporates.org/mediawiki/images/4/4a/Acme-Markets-1998.svg",
  
      // optional action for logo clicks
      action: "home",
    },
    items: [
      // menu item with label + icon
      { label: "User", icon: "user", action: "user" },
      // just an icon
      { icon: "bell", action: "alerts" },
      // rendered as a 'button'
      { label: "Admin", action: "admin", appearance: "button" },
      // a menu
      {
        label: "File",
        icon: "file",
  
        // list of menu items
        items: [
          { label: "New", action: "new" },
          { label: "Open", action: "open" },
          { label: "Save", action: "save" },
          // this item is *disabled*
          { label: "Export...", action: "export", disabled: true },
        ],
      },
    ],
  });
  
  // .didClick contains the selected "action"
  if (menu.didClick) {
    ui.toast(`You clicked "${menu.didClick}"`);
  }

  ui.md`### ☎️ Employee Tool`;

  const rows = db.any("SELECT id, name, email, role FROM employee");
  const table = ui.table(
    "employees", rows,
    {
      label: "Employees",
      size: "m",
      columns: {
        "*": { sort: true },
        id: {   hidden: true  },
        name: { search: true },
      },
      actions: [
        { action: "edit", label: "Edit" },
        { action: "remove", label: "Remove" },
      ],
    }
  );

  if (table.didRowAction) {
    const { row, action } = table.didRowAction;
    //await ui.alert({ text: `action: ${action} / name: ${row.name}` });
    console.log("action: ", action, " | name: ", row.name);
    if (action === "edit") {
      //const employee = table.selection[0];
      await ui.modal("modal", (ui) => editEmployee(ui, row));
    }
    else if (action === "remove") {
      await ui.confirm({ text: "Are you sure?" })
        ? await db.any("DELETE FROM employee WHERE id = $(id)", { id: row.id })
        : console.log("not deleting user: " + row.id);
    
    }

  }

  const add = ui.button("add", { label: "Add Employee" });
  if (add.didClick) {
    await ui.modal("modal", (ui) => addEmployee(ui));
  }

});

//
//
//
async function editEmployee(ui, employee) {
  ui.md`### Update Employee`;
  const edited = ui.form("employee", {
    fields: {
      name: ui.string("name", { label: "Name", required: true }),
      email: ui.email("email", { label: "Email", required: true }),
      role: ui.radioGroup("role", {
        label: "Role",
        options: "Manager, Developer, Analyst, Designer".split(","),
        required: true,
      }),
    },
    action: ui.button("update", { label: "Update Employee" }),
    defaultVal: employee,
  });
  if (edited.didSubmit) {
    await db.any(
      "UPDATE employee SET name = $(name), email = $(email), role = $(role) WHERE id = $(id)",
      { id: employee.id, ...edited.val }
    );
    ui.close();
  }
}

async function addEmployee(ui) {
  ui.md`### Add an Employee`;
  const employee = ui.form("employee", {
    fields: {
      name: ui.string("name", { label: "Name", required: true }),
      email: ui.email("email", { label: "Email", required: true }),
      role: ui.radioGroup("role", {
        label: "Role",
        options: "Manager, Developer, Analyst, Designer".split(","),
        required: true,
      }),
    },
    action: ui.button("add", { label: "Add Employee" }),
  });
  if (employee.didSubmit) {
    await db.any(
      "INSERT INTO employee (name, email, role) VALUES ($(name), $(email), $(role))",
      employee.val
    );
    ui.close();
  }
}


//
// function to initialize the database - Some random names, numbers and other stuff so it will be a 'full table'
//
async function initDB() {
  const DB_URL = process.env["CONNECTION_DB"];
  //console.log("DB_URL: ", DB_URL);

  const pgp = pgPromise({});
  const new_db = pgp(DB_URL);
  const table_name = "employee";

  const exists = await new_db.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
    [table_name]
  );

  // If the table exists, the `exists` variable will be `true`.
  if (exists[0].exists === true) {
    console.log("☕️ Table /employee/ already exists - skipping init of DB");
    return new_db;
  }

  // Create a new table of employee
  new_db
    .any(
      `
  CREATE TABLE employee (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL
  );
  `
    )
    .then((data) => {
      // Process the query results
      console.log("Created the table: " + JSON.stringify(data));
    })
    .catch((error) => {
      // Handle any errors
      console.error(error);
    });

  // Insert values to the employee table
  // Define an array of employee data
  const employees = [
    { name: "John Doe", email: "johndoe@example.com", role: "Manager" },
    { name: "Jane Smith", email: "janesmith@example.com", role: "Developer" },
    { name: "Mike Johnson", email: "mikejohnson@example.com", role: "Analyst" },
    { name: "Emily Brown", email: "emilybrown@example.com", role: "Designer" },
  ]; 

  // Insert values into the employee table
  new_db.tx((transaction) => {
    const queries = employees.map((employee) => {
      return transaction.none(
        "INSERT INTO employee(name, email, role) VALUES($1, $2, $3)",
        [employee.name, employee.email, employee.role]
      );
    });

    return transaction.batch(queries);
  })
    .then(() => {
      console.log("Values inserted successfully.");
    })
    .catch((error) => {
      console.error("Error inserting values:", error);
    });

  return new_db;
}