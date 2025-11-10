import express from "express";
import type { Request, Response } from "express";
import adminUsers from "../admin-users.json" with { type: "json" };
import cors from "cors";
import session from "express-session";
import { readFileSync, writeFileSync } from "fs";
import type { ArticleItf } from "./interfaces/data.interface.js";

const app = express();

app.use(session({
  secret: "admin user",
  resave: false,
	saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60
  }
}))

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "src/views");

app.get("/", (req: Request, res: Response) => {
  res.redirect("/home");
});

app.get("/home", (req: Request, res: Response) => {
  const data = JSON.parse(readFileSync("data.json", "utf-8"));
  res.render("home", {data: data});
});

app.get("/article/:id", (req: Request, res: Response) => {
  const data = JSON.parse(readFileSync("data.json", "utf-8"));
  const { id } = req.params;
  if (!id) {
    throw new Error("Id not found");
  };
  const articleById = data.find((article: ArticleItf) => article.id === Number(id));
  if (!articleById) {
    res.redirect("/404");
  } else {
    res.render("article", {data: articleById});
  }
});

app.get("/404", (req: Request, res: Response) => {
  res.render("404");
})

app.get("/login", (req: Request, res: Response) => {
  res.render("login");
})

app.post("/submit", (req: Request, res: Response) => {
  const {email, password} = req.body;
  const isAdmin = adminUsers.some((a) => a.email === email && a.password === password);
  (req.session as any).user  = {
    email: email,
    role: isAdmin ? "admin" : "user"
  };
  if ((req.session as any).user?.role === "admin") {
    res.sendStatus(200);
    console.log((req.session as any));
  } else {
    res.sendStatus(403);
  }
})

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

/* Admin Only */
app.get("/admin", (req: Request, res: Response) => {
  if ((req.session as any).user?.role === "admin") {
    const data = JSON.parse(readFileSync("data.json", "utf-8"));
    res.render("admin", {data: data});
  } else {
    res.redirect("/home");
  }
})

app.get("/edit/:id", (req: Request, res: Response) => {
  if ((req.session as any).user?.role === "admin") {
    const data = JSON.parse(readFileSync("data.json", "utf-8"));
    const { id } = req.params;
    if (!id) throw new Error("Id not found");

    const articleById = data.find((article: ArticleItf) => article.id === Number(id));
    if (!articleById) {
      res.redirect("/404");
    }

    const toFormattedDate = new Date(articleById.date);
    const yyyy = toFormattedDate.getFullYear();
    const mm = String(toFormattedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(toFormattedDate.getDate()).padStart(2, "0");

    const formatted = `${yyyy}-${mm}-${dd}`;
    articleById.date = formatted;

    res.render("edit", {data: articleById});
  } else {
    res.redirect("/login");
  }
})

app.patch("/edit/:id", (req: Request, res: Response) => {
  const data = JSON.parse(readFileSync("data.json", "utf-8"));
  const { title, date, content } = req.body;
  const { id } = req.params;
  if (!id) throw new Error("Id not found");

  const articleById = data.find((article: ArticleItf) => article.id === Number(id));
  if (!articleById) {
    res.redirect("/404");
  }

  articleById.title = title ?? articleById.title
  articleById.date = date ?? articleById.date
  articleById.content = content ?? articleById.content
  
  if ((req.session as any).user?.role === "admin") {
    writeFileSync("data.json", JSON.stringify(data, null, 2));
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
})

app.get("/new", (req: Request, res: Response) => {
  if ((req.session as any).user?.role === "admin") {
    res.render("new");
  } else {
    res.redirect("/login");
  }
})

app.post("/new", (req: Request, res: Response) => {
  const data = JSON.parse(readFileSync("data.json", "utf-8"));
  const { title, date, content } = req.body;

  if (!title || date === "Invalid Date" || !content) {
    res.sendStatus(400);
    return;
  }

  const newData = {
    id: (data ? data[data.length - 1]!.id : 0) + 1,
    title,
    date,
    content
  }

  if ((req.session as any).user?.role === "admin") {
    data.push(newData);
    writeFileSync("data.json", JSON.stringify(data, null, 2));
    res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
})

app.delete("/delete/:id", (req: Request, res: Response) => {
  const data = JSON.parse(readFileSync("data.json", "utf-8"));
  const { id } = req.params;
  if (!id) throw new Error("Id not found");
  if ((req.session as any).user?.role === "admin") {
  const newData = data.filter((article: ArticleItf) => article.id !== Number(id));
  writeFileSync("data.json", JSON.stringify(newData, null, 2));
  res.sendStatus(200);
  } else {
    res.sendStatus(403);
  }
});

app.use((req: Request, res: Response) => {
  res.status(404).render("404");
});

app.listen(3000, () => {
  console.log("app is listening on port 3000");
});
