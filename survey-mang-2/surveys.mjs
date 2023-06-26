/**
 * Interal survey management tool
 * @author greenido
 * @date 2023-06-25
 * @version 1.0.0
 * @see
 * Create Survery: https://surveyjs.io/survey-creator/examples/product-feedback-survey-template/reactjs
 * Publish Survery: https://surveyjs.io/form-library/documentation/get-started-react
 * Gen examples: https://github.com/surveyjs/surveyjs-react-client
 *
 * DB Postgres: https://console.neon.tech/app/projects/noisy-breeze-647787/tables
 * JSONB: https://www.freecodecamp.org/news/postgresql-and-json-use-json-data-in-postgresql/
 *
 */
import { SkyMass } from "@skymass/skymass";
import "dotenv/config";

import pgPromise from "pg-promise";

const db = await initDB();
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });

//
// Main page
//
sm.page("/surveys-mang-1", async (ui) => {
  const menu = ui.menubar({
    logo: {
      text: "Surveys",
      // optional image
      src: "https://upload.wikimedia.org/wikipedia/commons/1/1b/Online_Survey_Icon_or_logo.svg",
      action: "home",
    },
    items: [
      // menu item with label + icon
      // { label: "User", icon: "user", action: "user" },
      // just an icon
      { icon: "bell", action: "alerts" },
      // rendered as a 'button'
      // { label: "Admin", action: "admin", appearance: "button" },
      // A menu
      {
        label: "Survey",
        icon: "file",

        // list of menu items
        items: [
          { label: "New", action: "new" },
          { label: "Save", action: "save" },
          // this item is *disabled*
          { label: "Export...", action: "export", disabled: true },
        ],
      },
    ],
  });

  if (menu.didClick) {
    if (menu.didClick === "new") {
      await ui.modal("modal", (ui) => addSurvey(ui));
    }
    ui.toast(
      `You clicked "${menu.didClick}" - not implemented yet... but soon!`
    );
  }

  ui.md`### ☎️ Survey Tool`;

  const rows = db.any(
    "SELECT id, name, survey_definition, live_from, results_key, comments FROM survey"
  );
  const table = ui.table("surveys", rows, {
    label: "surveys",
    size: "m",
    columns: {
      "*": { sort: true },
      id: { hidden: true },
      name: { search: true },
    },
    actions: [
      { action: "edit", label: "Edit" },
      { action: "remove", label: "Remove" },
    ],
  });

  if (table.didRowAction) {
    const { row, action } = table.didRowAction;
    //await ui.alert({ text: `action: ${action} / name: ${row.name}` });
    console.log("action: ", action, " | name: ", row.name);
    if (action === "edit") {
      await ui.modal("modal", (ui) => editSurvey(ui, row));
    } else if (action === "remove") {
      (await ui.confirm({ text: "Are you sure?" }))
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
  let tmp_survey_definition = JSON.stringify(survey.survey_definition);
  const edited = ui.form("survey", {
    fields: {
      name: ui.string("name", {
        label: "Name",
        required: true,
        defaultVal: survey.name,
      }),
      survey_definition: ui.textarea("survey_definition", {
        label: "survey_definition",
        required: true,
        defaultVal: tmp_survey_definition,
      }),
      live_from: ui.date("live_from", {
        label: "Live from",
        required: true,
        defaultVal: survey.live_from,
      }),
      results_key: ui.string("results_key", {
        label: "Results key",
        required: true,
        defaultVal: survey.results_key,
      }),
      comments: ui.string("comments", {
        label: "Comments",
        required: true,
        defaultVal: survey.comments,
      }),
    },
    action: ui.button("update", { label: "Update survey" }),
    // defaultVal: survey,
  });
  console.log("-------------\n\n");
  console.log(survey);

  if (edited.didSubmit) {
    let json_survey_definition = {};
    try {
      json_survey_definition = JSON.parse(edited.val.survey_definition);
    } catch (error) {
      console.log("Error parsing json: ", error);
      console.log("json_survey_definition: ", json_survey_definition);
    }
    await db.any(
      "UPDATE survey SET name=$(name) , survey_definition=$(survey_definition), \
        live_from=$(live_from), results_key=$(results_key), comments=$(comments) WHERE id = $(id)",
      {
        id: survey.id,
        name: edited.val.name,
        survey_definition: json_survey_definition,
        ...edited.val,
      }
    );
    ui.close();
  }
}

//
// survey(name, survey_definition, live_from, results_key, comments)
//
async function addSurvey(ui) {
  ui.md`### Add a survey`;
  const survey = ui.form("survey", {
    fields: {
      name: ui.string("name", { label: "Name", required: true }),
      survey_definition: ui.textarea("survey_definition", {
        label: "survey_definition",
        required: true,
        defaultVal: "{}",
      }),
      live_from: ui.date("live_from", { label: "Live from", required: true }),
      results_key: ui.string("results_key", {
        label: "Results key",
        required: true,
      }),
      comments: ui.string("comments", { label: "Comments", required: true }),
    },
    action: ui.button("add", { label: "Add survey" }),
  });
  if (survey.didSubmit) {
    if (
      survey.val.survey_definition === "" ||
      survey.val.survey_definition === undefined ||
      survey.val.survey_definition === " "
    ) {
      survey.val.survey_definition = "{}";
    }
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
  //console.log("DB_URL: ", DB_URL);

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
      `CREATE TABLE survey (
    id INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY (START WITH 1000),
    name VARCHAR(250) NOT NULL,
    survey_definition JSONB,
    live_from TIMESTAMPTZ,
    results_key VARCHAR(250),
    comments VARCHAR(1000) );`
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

//
// Insert values to the survey table
//
async function fillData(new_db) {
  const surveys = [
    {
      name: "Survey Doe",
      survey_definition:
        '{ "title": "Testing survey 2", "logoPosition": "right" }',
      live_from: "2023-06-22T00:00:00.000-07:00",
      results_key: "1",
      comments: "This is a comment",
    },
    {
      name: "Survey Smith",
      survey_definition: "{}",
      live_from: "2023-06-22T00:00:00.000-07:00",
      results_key: "1",
      comments: "This is a comment",
    },
    {
      name: "Survey Johnson",
      survey_definition: "{}",
      live_from: "2023-06-22T00:00:00.000-07:00",
      results_key: "1",
      comments: "This is a comment",
    },
    {
      name: "Survey Brown",
      survey_definition: "{}",
      live_from: "2023-06-22T00:00:00.000-07:00",
      results_key: "1",
      comments: "This is a comment",
    },
  ];

  // Insert values into the survey table
  new_db
    .tx((transaction) => {
      const queries = surveys.map((survey) => {
        return transaction.none(
          "INSERT INTO survey(name, survey_definition, live_from, results_key, comments) VALUES($1, $2, $3, $4, $5)",
          [
            survey.name,
            survey.survey_definition,
            survey.live_from,
            survey.results_key,
            survey.comments,
          ]
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
