import { SkyMass } from "@skymass/skymass";
import "dotenv/config";


function getRandName() {
  const randNum = Math.floor(Math.random()*1000);
  return "Project #" + randNum;
}

const NF = new Intl.NumberFormat();

function format_number(num) {
  return NF.format(num);
}

//
//
//
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });

sm.page("/project-calc", async (ui) => {
  ui.md`## 🧮 Project Estimation Calculator`;
  const tasks = ui.form("tasks", {
    fields: {
      name: ui.string("name", {
        required: true,
        placeholder: "Project Name",
        defaultVal: getRandName()
      }),
      customer: ui.string("customer", {
        required: true,
        placeholder: "Customer Name",
        defaultVal: "Google"
      }),
      duration: ui.number("duration", {
        required: true,
        placeholder: "How many hours (the minimum is 20h)",
        min: 20,
        max: 1000,
        defaultVal: 40
      }),
      devs: ui.number("devs", {
        min: 1,
        max: 10,
        step: 1,
        label: "Number of developers",
        defaultVal: 2
      }),
      costPerDev: ui.number("costPerDev", {
        min: 100,
        max: 800,
        step: 50,
        label: "The Cost of a developer per hour",
        defaultVal: 250
      }),
      designer: ui.number("designer", {
        min: 0,
        max: 5,
        step: 1,
        label: "Number of desingers",
        defaultVal: 1
      }),
      pm: ui.number("pm", {
        min: 0,
        max: 5,
        step: 1,
        label: "Number of Product Managers",
        defaultVal: 1
      }),
    },
    action: ui.button("run", {
      label: "Calculate",
    }),
  });

  if (tasks.didSubmit) {
    console.log("==== Got the values ====");
    console.log(tasks.val);

    // Let's say it's $200 for now :)
    const cost = tasks.val.devs * tasks.val.costPerDev * tasks.val.duration + 
      tasks.val.pm * 200 * tasks.val.duration/4 + tasks.val.designer * 200 * tasks.val.duration/4;
    const costNum = format_number(cost);
    ui.modal("calcModal", (ui) => {
      ui.md`# ⚖️ The project estimation ⚖️
      ### ${tasks.val.devs} x developers (at $${tasks.val.costPerDev}/h) x ${tasks.val.duration} hours, 
      ### ${tasks.val.designer} x designers (at $200/h) x ${tasks.val.duration / 4} hours,
      ###  ${tasks.val.pm} x PMs (at $200/h) x ${tasks.val.duration / 4} hours
      ---------
      # <font color='yellow'>The total: $${costNum}</font>
      ![The road map](https://cdn.glitch.global/79463bb2-0f2d-47e2-bd51-02e913883019/road-map.jpg?v=1673062724521)`

      if (ui.button("done", { label: "Done" }).didClick) {
        ui.close();
      }
    });
    
  }

});

