package org.community.booking;

/**
 * Exception thrown when booking or free time operations violate business rules.
 */
public class BookException extends RuntimeException {

    public BookException(String message) {
        super(message);
    }

    public BookException(String message, Throwable cause) {
        super(message, cause);
    }
}
