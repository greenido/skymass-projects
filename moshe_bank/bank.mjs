import { SkyMass } from "@skymass/skymass";
import Database from "better-sqlite3";
import "dotenv/config";

const db = await init_db();

const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });

sm.page("/bank", async (ui) => {
  ui.menubar({
    logo: {
      text: "🔵 V.Run LTD חברת",
    },
  });

  // get list of banks and branches from DB
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

  // inputs...
  const check_num = ui.number("check_num", { label: "מספר צ׳ק #" });
  const bank = ui.select("bank", { label: "בנק", options: BANKS });
  const branch = ui.select("branch", { label: "סניף", options: BRANCHES });
  const date_from = ui.date("date_from", { label: "תאריך" });
  const date_to = ui.date("date_to", {});
  const amount_from = ui.number("amount_from", { label: "סכום" });
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
    label: "צ׳קים",
    columns: {
      id: { isId: true, hidden: true },
      customer: { label: "לקוח" },
      memo: { label: "הערות" },
      recipient: { label: "למי" },
      id_num: { label: "ID #" },
      check_num: { label: "מספר צ׳ק" },
      bank: { label: "בנק" },
      branch: { label: "סניף" },
      account: { label: "מספר חשבון #" },
      code: { label: "קוד", format: "pill" },
      date: { label: "תאריך", format: "date_short" },
      status: { label: "סטאטוס", format: "pill" },
      amount: { label: "סכום", format: "NIS" },
      total: { label: "סה׳כ", format: "NIS" },
    },
  });
});

// return a rand int between min, max
function rand_range(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

// return a rand element from an array
function rand(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

// convert comma separated string into a trimmed array
function list(str) {
  return str.split(",").map((x) => x.trim());
}

// convert date -> unixtime
function date_to_unixtime(d) {
  return Math.round(d.getTime() / 1000);
}

// convert unixtime -> date
function unixtime_to_date(u) {
  const d = new Date();
  d.setTime(u * 1000);
  return d;
}

// function to initialize the database
async function init_db() {
  const FIRST = list("משה, עופר, פלד, אילן, גילי, בארשי, קלוד, יריב"); //"Gad, Ido, Eyal, Beni, Miri, Asaf, Moshe");
  const LAST = list("כהן, לוי, פוד, בן-שבת, מוש, גוש");
  const NAMES = FIRST.flatMap((first) =>
    LAST.map((last) => `${first} ${last}`)
  );
  const BANK = list("לאומי, מזרחי, פועלים");
  const BRANCH = list("יהוד 453, תל אביב 768, ירושלים 323");
  const MEMO = list(
    "שכירות, הלוואה, ארוחות, חשבון חשמל, חשבון מים, חשבון גז, בית ספר, רפואה"
   // "Rent, Insurance, Lunch, Dinner, Phone Co, Electric Bill, Water Bill, School, Doctor"
  );

  const CUSTOMERS = NAMES.map((name) => ({
    customer: name,
    bank: rand(BANK),
    branch: rand(BRANCH),
    account: rand_range(1000000, 2000000),
  }));

  const STATUS = list("שולם, בהמתנה, נדחה, בעיבוד, תקלה");
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

  // populate with 100 imaginary checks
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