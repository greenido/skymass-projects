import { SkyMass } from "@skymass/skymass";
import Database from "better-sqlite3";
import "dotenv/config";

// Setting the DB (for the demo it's all in memory)
const db = await init_db();
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });

// The main 'check' page
sm.page("/bank", async (ui) => {
  ui.menubar({
    logo: {
      text: "馃數 V.Run LTD 讞讘专转",
    },
  });

  //
  // get list of banks and branches from DB
  //
  const BANKS = db
    .prepare("SELECT DISTINCT bank FROM check_deposit")
    .all()
    .map(({ bank }) => bank);

  const BRANCHES = db
    .prepare("SELECT DISTINCT branch FROM check_deposit")
    .all()
    .map(({ branch }) => branch);

  // layout inputs
  ui.md`
  {check_num} {bank} {branch} {date_from} {amount_from} ~ ~
  ~            ~     ~        {date_to}   {amount_to} ~ ~`;

  //
  // inputs to filter the main check table
  //
  const check_num = ui.number("check_num", { label: "诪住驻专 爪壮拽 #" });
  const bank = ui.select("bank", { label: "讘谞拽", options: BANKS });
  const branch = ui.select("branch", { label: "住谞讬祝", options: BRANCHES });
  const date_from = ui.date("date_from", { label: "转讗专讬讱" });
  const date_to = ui.date("date_to", {});
  const amount_from = ui.number("amount_from", { label: "住讻讜诐" });
  const amount_to = ui.number("amount_to", {});

  // construct a WHERE clause if any filters are specified
  const where = ["1 = 1"];
  const binds = {};
  if (branch.val) {
    where.push("branch = :branch");
    binds.branch = branch.val;
  }
  if (bank.val) {
    where.push("bank = :bank");
    binds.bank = bank.val;
  }
  if (check_num.isReady && check_num.val) {
    where.push("check_num LIKE :check_num");
    binds.check_num = `${check_num.val}%`;
  }
  if (amount_from.isReady && amount_from.val) {
    where.push("amount >= :amount_from");
    binds.amount_from = amount_from.val;
  }
  if (amount_to.isReady && amount_to.val) {
    where.push("amount <= :amount_to");
    binds.amount_to = amount_to.val;
  }
  if (date_from.isReady && date_from.val) {
    where.push("date >= :date_from");
    binds.date_from = date_to_unixtime(date_from.val);
  }
  if (date_to.isReady && date_to.val) {
    where.push("date <= :date_to");
    binds.date_to = date_to_unixtime(date_to.val);
  }

  // select the checks to show in the table
  const checks = db
    .prepare(`SELECT * FROM check_deposit WHERE ${where.join(" AND ")}`)
    .all(binds)
    .map((check) => {
      const date = new Date();
      check.date = unixtime_to_date(check.date);
      return check;
    });

  // render the table
  ui.table("checks", checks, {
    label: "爪壮拽讬诐",
    columns: {
      id: { isId: true, hidden: true },
      customer: { label: "诇拽讜讞" },
      memo: { label: "讛注专讜转" },
      recipient: { label: "诇诪讬" },
      id_num: { label: "ID #" },
      check_num: { label: "诪住驻专 爪壮拽" },
      bank: { label: "讘谞拽" },
      branch: { label: "住谞讬祝" },
      account: { label: "诪住驻专 讞砖讘讜谉 #" },
      code: { label: "拽讜讚", format: "pill" },
      date: { label: "转讗专讬讱", format: "date_short" },
      status: { label: "住讟讗讟讜住", format: "pill" },
      amount: { label: "住讻讜诐", format: "NIS" },
      total: { label: "住讛壮讻", format: "NIS" },
    },
  });
});

//
// return a rand int between min, max
//
function rand_range(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

//
// return a rand element from an array
//
function rand(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

//
// convert comma separated string into a trimmed array
//
function list(str) {
  return str.split(",").map((x) => x.trim());
}

//
// convert date -> unixtime
//
function date_to_unixtime(d) {
  return Math.round(d.getTime() / 1000);
}

//
// convert unixtime -> date
//
function unixtime_to_date(u) {
  const d = new Date();
  d.setTime(u * 1000);
  return d;
}

//
// function to initialize the database - Some random names, numbers and other stuff so it will be a 'full table'
//
async function init_db() {
  const FIRST = list("诪砖讛, 注讜驻专, 驻诇讚, 讗讬诇谉, 讙讬诇讬, 讘讗专砖讬, 拽诇讜讚, 讬专讬讘"); //"Gad, Ido, Eyal, Beni, Miri, Asaf, Moshe");
  const LAST = list("讻讛谉, 诇讜讬, 驻讜讚, 讘谉-砖讘转, 诪讜砖, 讙讜砖");
  const NAMES = FIRST.flatMap((first) =>
    LAST.map((last) => `${first} ${last}`)
  );
  const BANK = list("诇讗讜诪讬, 诪讝专讞讬, 驻讜注诇讬诐");
  const BRANCH = list("讬讛讜讚 453, 转诇 讗讘讬讘 768, 讬专讜砖诇讬诐 323");
  const MEMO = list(
    "砖讻讬专讜转, 讛诇讜讜讗讛, 讗专讜讞讜转, 讞砖讘讜谉 讞砖诪诇, 讞砖讘讜谉 诪讬诐, 讞砖讘讜谉 讙讝, 讘讬转 住驻专, 专驻讜讗讛"
   // "Rent, Insurance, Lunch, Dinner, Phone Co, Electric Bill, Water Bill, School, Doctor"
  );

  const CUSTOMERS = NAMES.map((name) => ({
    customer: name,
    bank: rand(BANK),
    branch: rand(BRANCH),
    account: rand_range(1000000, 2000000),
  }));

  const STATUS = list("砖讜诇诐, 讘讛诪转谞讛, 谞讚讞讛, 讘注讬讘讜讚, 转拽诇讛");
    //"OK,Rejected,Waiting,Processing");
  const new_db = new Database(":memory:");

  new_db
    .prepare(
      `
  CREATE TABLE check_deposit (
    id INTEGER PRIMARY KEY,
    customer TEXT,
    memo TEXT,
    recipient TEXT,
    id_num INTEGER,
    check_num INTEGER,
    bank TEXT,
    branch TEXT,
    account INTEGER,
    code INTEGER,
    date INTEGER,
    status TEXT,
    amount INTEGER,
    total INTEGER
  )
  `
    )
    .run();

  const insert_check = new_db.prepare(
    `
    INSERT INTO check_deposit 
      (customer, memo, recipient, id_num, check_num, bank, branch, account, code, date, status, amount, total) 
    VALUES
    (:customer, :memo, :recipient, :id_num, :check_num, :bank, :branch, :account, :code, :date, :status, :amount, :total) 
`
  );

  //
  // populate with 100 imaginary checks
  //
  Array(100)
    .fill(0)
    .forEach(() => {
      const customer = rand(CUSTOMERS);
      const date = new Date();
      date.setDate(date.getDate() + rand_range(1, 100));
      insert_check.run({
        ...customer,
        memo: rand(MEMO),
        recipient: rand(NAMES.filter((other) => other != customer.name)),
        id_num: rand_range(1e9, 2e9),
        check_num: rand_range(1000, 5000),
        code: rand_range(100, 200),
        date: date_to_unixtime(date),
        status: rand(STATUS),
        amount: Math.round(rand_range(1000, 5000) / 50) * 50,
        total: 0,
      });
    });

  return new_db;
}