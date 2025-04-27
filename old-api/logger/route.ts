export function GET (request: Request) {
    return Response.json(`# Library One-Screen Book Management System
    \n
    ## 1. Functional Requirements
    - The system uses CRUD operations for managing book inventory.
    \n
    ## 2. Attributes
    - **Book Attributes:**
      - Name
      - ISBN
      - Price
    \n
    ## 3. Validation Rules
    - **Name:** must not be empty.
    - **ISBN:** must follow a specific format (e.g., 10 or 13 digits).
    - **Price:** must be a positive number.`)
}