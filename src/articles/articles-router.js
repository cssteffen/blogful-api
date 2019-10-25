const path = require("path");
const express = require("express");
const xss = require("xss");
const ArticlesService = require("./articles-service");

const ArticlesRouter = express.Router();
const jsonParser = express.json();

const sanitizeArticle = article => ({
  id: article.id,
  style: article.style,
  title: xss(article.title),
  content: xss(article.content),
  date_published: article.date_published
});

ArticlesRouter.route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    ArticlesService.getAllArticles(knexInstance)
      .then(articles => {
        res.json(articles);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body;
    const newArticle = { title, content, style };

    /* === repeating info ===========
    if (!title) {
      return res.status(400).json({
        error: { message: `Missing 'title' in request body` }
      });
    }

    if (!content) {
      return res.status(400).json({
        error: { message: `Missing 'content' in request body` }
      });
    }
    =============================== */

    for (const [key, value] of Object.entries(newArticle)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        });
      }
    }

    ArticlesService.insertArticle(req.app.get("db"), newArticle)

      .then(article => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl + `/${article.id}`));
        //.json(article);
        res.json(sanitizeArticle(article));

        /* ======= Repeating code ========
        res.json({
          id: article.id,
          style: article.style,
          title: xss(article.title), //sanitize title
          content: xss(article.content), //sanitize content
          date_published: article.date_published
        });
        ================================== */
      })
      .catch(next);
  });

ArticlesRouter.route("/:article_id")
  .all((req, res, next) => {
    const knexInstance = req.app.get("db");
    ArticlesService.getById(knexInstance, req.params.article_id)
      .then(article => {
        if (!article) {
          return res.status(404).json({
            error: { message: `Article doesn't exist` }
          });
        }
        res.article = article; //save the article for the next middleware
        next(); // don't forget to call next so the next middleware happens!
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(sanitizeArticle(res.article));
    /* ========= included in .all now =========
    const knexInstance = req.app.get("db");

    ArticlesService.getById(knexInstance, req.params.article_id)
      .then(article => {
        if (!article) {
          return res.status(404).json({
            error: { message: `Article doesn't exist` }
          });
        }
        //      res.json(article);
        res.json(sanitizeArticle(article)); */

    /* ======= Repeating code ========
      res.json({
        id: article.id,
        style: article.style,
        title: xss(article.title), //sanitize title
        content: xss(article.content), //sanitize content
        date_published: article.date_published
      });
      ================================== */

    /* ---contin.. included in .all now ---
      })
      .catch(next);
      --------------------*/
  })
  .delete((req, res, next) => {
    //res.status(204).end()
    const knexInstance = req.app.get("db");
    ArticlesService.deleteArticle(knexInstance, req.params.article_id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(jsonParser, (req, res, next) => {
    const { title, content, style } = req.body;
    const articleToUpdate = { title, content, style };

    const numberOfValues = Object.values(articleToUpdate).filter(Boolean)
      .length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message:
            "Request body must contain either 'title', 'style' or 'content'"
        }
      });
    }

    ArticlesService.updateArticle(
      req.app.get("db"),
      req.params.article_id,
      articleToUpdate
    )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = ArticlesRouter;
