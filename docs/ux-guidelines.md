# Code & Consequence — UX guidelines

## Core principle

Code & Consequence is a public-interest editorial observatory. The default experience must optimize for finding, understanding and verifying information with the fewest reasonable steps.

## Navigation

- Keep the primary navigation stable across all public pages.
- Always indicate the current section.
- Mobile navigation must be explicit and must not depend on horizontal scrolling.
- Changing language should preserve the current content route whenever an equivalent localized route exists.
- Provide global search from every public page.
- Detail pages should always offer a clear path back to their parent collection.

## Calls to action

- Use one visually dominant CTA when a section has a clear primary action.
- CTA labels should describe the destination or result: `Explore initiatives`, `View event`, `Read analysis`.
- Avoid generic labels such as `Click here`, `Continue` or unexplained icons.
- Do not create CTAs for unavailable features.

## Information discovery

- Search should cover initiatives, editorial articles, events and topics.
- Large collections should provide in-page search and filters before pagination is introduced.
- Filters must be reversible in one action and must expose the current result count.
- Empty states must explain how to recover rather than ending the flow.

## Click reduction

- Do not require a user to visit an intermediate page if the destination can be reached safely from the current context.
- Preserve context when switching language or moving between related records.
- Prefer inline filtering and search over multi-page filter forms.
- Repeated primary destinations should remain reachable from the header and contextual CTAs.

## Registration and login

There is currently no account feature, and public reading must not be gated by an account.

If accounts are introduced later:

1. Ask for registration only when the user requests a persistent feature such as saved records, alerts or personalization.
2. Keep initial registration to the minimum identity information required.
3. Preserve the page or action that triggered authentication and return the user to it after success.
4. Offer password recovery directly from the login screen.
5. Never force login merely to read articles, initiatives, events or source evidence.

## Newsletter or alert signup

If subscriptions are introduced, use a short flow: email first, preferences second only when necessary. Confirmation, validation errors and unsubscribe controls must be explicit.

## Payment

There is currently no paid product or checkout flow. Do not add payment UI until a real product, price and fulfillment path exist.

If payment is introduced later:

1. Show product, price and billing cadence before checkout.
2. Avoid account creation before payment unless technically necessary.
3. Minimize checkout steps and preserve entered data after recoverable errors.
4. Display the final charge clearly before confirmation.
5. Provide a clear success state and next action after payment.
6. Never use deceptive urgency, preselected add-ons or hidden recurring charges.

## Accessibility baseline

- Keyboard-visible focus is mandatory.
- Interactive controls need accessible names and explicit states.
- Search dialogs must close with Escape, move focus into the search field when opened and return focus when closed.
- A skip-to-content control should be available for keyboard and assistive-technology users.
- Result counts and filter changes should be announced without forcing navigation.

## Acceptance criteria for public UX changes

A change is ready when a user can:

- identify the current section;
- reach primary destinations on desktop and mobile without horizontal navigation scrolling;
- search the whole public corpus from any page;
- search and filter initiatives without page reloads;
- clear all filters in one action;
- switch language without being unnecessarily returned to the home page;
- reach main content using keyboard navigation;
- understand what every primary CTA will do before activating it.
