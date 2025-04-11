# End-to-End (E2E) Testing

This folder contains all the end-to-end tests for our Electron application, ensuring that key workflows function as expected.

## Running the Tests Locally

To execute the tests locally, follow these steps:

1. Start the Electron app in one terminal window:
   ```sh
   yarn run electron:serve
   ```
2. Run the E2E tests in another terminal window:
   ```sh
   yarn run test:e2e
   ```

## Project Structure

The E2E tests are organized into the following folders:

### `pageComponents/`
This folder contains **Page Object Model (POM) files**, which we call **components**. These files define the locators for UI elements but do not contain any logic for user interactions.

### `pageActions/`
This folder contains **actions that users can perform using the components** from the `pageComponents` folder. These actions encapsulate user interactions like filling in forms, clicking buttons, and navigating through the app.

### `tests/`
This folder contains the actual test cases. The tests use the **`userAttemptsTo` object** to execute actions from the `pageActions` folder, making the test scripts clean and readable.

## Best Practices
- Keep **selectors** inside the `pageComponents` folder.
- Keep **user interactions** inside the `pageActions` folder.
- Use **the `userAttemptsTo` object** in tests to maintain clean and structured test cases.
- Run tests frequently to catch regressions early.

---

Feel free to reach out if you have any questions or suggestions for improving the test structure!

