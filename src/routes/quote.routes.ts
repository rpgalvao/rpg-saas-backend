import { Router } from "express";
import * as QuoteController from "../controllers/quote.controller";

const route = Router();

route.post('/quotes', QuoteController.createQuote);
route.get('/deals/:dealId/quotes', QuoteController.getQuotesByDeal);
route.patch('/quotes/:id/status', QuoteController.updateQuoteStatus);
route.delete('/quotes/:id', QuoteController.deleteQuote);
route.post('/quotes/:id/items', QuoteController.addQuoteItem);
route.patch('/quotes/:quoteId/items/:itemId', QuoteController.updateQuoteItem);
route.delete('/quotes/:quoteId/items/:itemId', QuoteController.deleteQuoteItem);

export default route;
