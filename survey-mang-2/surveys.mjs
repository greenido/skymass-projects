import { SkyMass } from "@skymass/skymass";
import "dotenv/config";

import pgPromise from "pg-promise";

const db = await initDB();
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });


//
//
//
sm.page("/surveys-mang-1", async (ui) => {
  const menu = ui.menubar({
    logo: {
      // text - if no src is specified
      text: "Surveys",
  
      // optional image
      src: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Online_Survey_Icon_or_logo.svg",
  
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

  ui.md`### ☎️ Survey Tool`;

  const rows = db.any("SELECT id, name, survey_definition, live_from, results_key, comments FROM survey");
  const table = ui.table(
    "surveys", rows,
    {
      label: "surveys",
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
      await ui.modal("modal", (ui) => editSurvey(ui, row));
    }
    else if (action === "remove") {
      await ui.confirm({ text: "Are you sure?" })
        ? await db.any("DELETE FROM survey WHERE id = $(id)", { id: row.id })
        : console.log("Not deleting survery: " + row.id);
    
    }

  }

  const add = ui.button("add", { label: "Add survey" });
  if (add.didClick) {
    await ui.modal("modal", (ui) => addSurvey(ui));
  }

});

//
//
//
async function editSurvey(ui, survey) {
  ui.md`### Update survey`;
  const edited = ui.form("survey", {
    fields: {
      name: ui.string("name", { label: "Name", required: true }),
      survey_definition: ui.survey_definition("survey_definition", { label: "survey_definition", required: true }),
      live_from: ui.date("live_from", { label: "Live from", required: true }),
      results_key: ui.string("results_key", { label: "Results key", required: true }),
      comments: ui.string("comments", { label: "Comments", required: true }),
    },
    action: ui.button("update", { label: "Update survey" }),
    defaultVal: survey,
  });
  if (edited.didSubmit) {
    await db.any(
      "UPDATE survey SET name = $(name), survey_definition = $(survey_definition), role = $(role) WHERE id = $(id)",
      { id: survey.id, ...edited.val }
    );
    ui.close();
  }
}

//
//
// survey(name, survey_definition, live_from, results_key, comments)
async function addSurvey(ui) {
  ui.md`### Add a survey`;
  const survey = ui.form("survey", {
    fields: {
      name: ui.string("name", { label: "Name", required: true }),
      survey_definition: ui.textarea("survey_definition", { label: "survey_definition", required: true }),
      live_from: ui.date("live_from", { label: "Live from", required: true }),
      results_key: ui.string("results_key", { label: "Results key", required: true }),
      comments: ui.string("comments", { label: "Comments", required: true }),
    },
    action: ui.button("add", { label: "Add survey" }),
  });
  if (survey.didSubmit) {
    await db.any(
      "INSERT INTO survey (name, survey_definition, live_from, results_key, comments) VALUES ($(name), $(survey_definition), $(live_from), $(results_key), $(comments) )",
      survey.val
    );
    ui.close();
  }
}


//
// function to initialize the database - Some random names, numbers and other stuff so it will be a 'full table'
//
async function initDB() {
  const DB_URL = process.env["CONNECTION_DB"];
  console.log("DB_URL: ", DB_URL);

  const pgp = pgPromise({});
  const new_db = pgp(DB_URL);
  const table_name = "survey";

  const exists = await new_db.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
    [table_name]
  );

  // If the table exists, the `exists` variable will be `true`.
  if (exists[0].exists === true) {
    console.log("☕️ Table /survey/ already exists - skipping init of DB");
    return new_db;
  }

  // Create a new table of survey
  new_db
    .any(
      `
  CREATE TABLE survey (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000),
    name VARCHAR(250) NOT NULL,
    survey_definition JSONB,
    live_from TIMESTAMPTZ,
    results_key VARCHAR(250),
    comments VARCHAR(1000)
  );
  `
    )
    .then((data) => {
      // Process the query results
      console.log("Created the table: " + JSON.stringify(data));
      fillData(new_db);
    })
    .catch((error) => {
      // Handle any errors
      console.error(error);
    });

  return new_db;
}

// Insert values to the survey table
// Define an array of survey data
async function fillData(new_db) {  
  const surveys = [
    { name: "Survey Doe", survey_definition: '{ "title": "Testing survey 2", "logoPosition": "right" }', live_from: "2023-06-22T00:00:00.000-07:00", results_key: "1", comments: "This is a comment" },
    { name: "Survey Smith", survey_definition: "{}", live_from: "2023-06-22T00:00:00.000-07:00", results_key: "1", comments: "This is a comment" },
    { name: "Survey Johnson", survey_definition: "{}", live_from: "2023-06-22T00:00:00.000-07:00", results_key: "1", comments: "This is a comment" },
    { name: "Survey Brown", survey_definition: "{}", live_from: "2023-06-22T00:00:00.000-07:00", results_key: "1", comments: "This is a comment" },
  ]; 

  // Insert values into the survey table
  new_db.tx((transaction) => {
    const queries = surveys.map((survey) => {
      return transaction.none(
        "INSERT INTO survey(name, survey_definition, live_from, results_key, comments) VALUES($1, $2, $3, $4, $5)",
        [survey.name, survey.survey_definition, survey.live_from, survey.results_key, survey.comments]
      );
    });
    return transaction.batch(queries);
  })
    .then(() => {
      console.log("Values inserted successfully into the survey table 🙌🏾");
    })
    .catch((error) => {
      console.error("🚨 Error inserting values:", error);
    });
}