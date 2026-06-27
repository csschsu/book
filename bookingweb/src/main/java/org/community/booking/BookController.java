/*
Generate CreateBookinDB.java using jdbi to create sqlite tables to save garage, parking id, free and booked time for a supplier and a buyer of time. 
Generate a time booking function in this file searching free time and generate a booking when it finds free time
 where booking fits. Booking must be registered within current timestamp - 5 minutes and booking starts on the requested time. 
*/

package org.community.booking;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController

public class BookController {

  @GetMapping("/book")
  public String book() {
    return "Greetings from Spring Boot!";
  }

}
