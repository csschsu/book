/*
Generate CreateBookinDB.java using jdbi to create sqlite tables to save garage, parking id, free and booked time for a supplier and a buyer of time. 
Generate a time booking function in this file searching free time and generate a booking when it finds free time
 where booking fits. Booking must be registered within current timestamp - 5 minutes and booking starts on the requested time. 
*/

package org.community.booking;

import java.time.LocalDateTime;
import java.util.List;

import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController

public class BookController {

  private static String DB_URL = "jdbc:sqlite:../booking_system.db?foreign_keys=true";
  Jdbi jdbi = Jdbi.create(DB_URL);

  @GetMapping("/book")
  public String book() {
    return "Greetings from Spring Boot!";
  }

  @GetMapping("/free")
  public String free() {
    jdbi.installPlugin(new SqlObjectPlugin());
    Book book = new Book(jdbi);
    List<Book.Timeslot> slots = book.findTimeslot("Location 1", LocalDateTime.now());
    return slots.toString();

  }

}
