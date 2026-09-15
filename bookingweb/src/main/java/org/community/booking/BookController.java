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
import org.community.booking.security.UserPrincipal;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
public class BookController {

  private static final String DB_URL = "jdbc:sqlite:booking_system.db?foreign_keys=true";
  private final Book book;

  public BookController() {
    Jdbi jdbi = Jdbi.create(DB_URL);
    jdbi.installPlugin(new SqlObjectPlugin());
    this.book = new Book(jdbi);
  }

  // Constructor for testing / dependency injection
  @org.springframework.beans.factory.annotation.Autowired
  public BookController(Book book) {
    this.book = book;
  }

  @GetMapping("/book")
  public String book() {
    return "Greetings from Spring Boot!";
  }

  @GetMapping("/assetlocations")
  public List<Models.AssetLocation> getAssetLocations() {
    return book.getAssetLocations();
  }

  @GetMapping("/locations")
  public List<Models.Location> getLocations() {
    return book.getLocations();
  }

  @GetMapping("/booked")
  public List<Models.Booked> getBooked(@RequestParam("locationId") int locationId) {
    return book.getBookedBlocksByLocation(locationId);
  }

  @GetMapping("/booked/{locationId}")
  public List<Models.Booked> getBookedByLocationId(@PathVariable("locationId") int locationId) {
    return book.getBookedBlocksByLocation(locationId);
  }

  @GetMapping("/free")
  public List<Models.Free> getFree(@RequestParam("locationId") int locationId) {
    return book.getFreeBlocksByLocation(locationId);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @GetMapping("/free/{locationId}")
  public List<Models.Free> getFreeByLocationId(@PathVariable("locationId") int locationId) {
    return book.getFreeBlocksByLocation(locationId);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @PostMapping("/free")
  public String free(@RequestBody Models.Location location) {
    LocalDateTime now = LocalDateTime.now();
    List<Models.Timeslot> slots = book.findTimeslot(location, now, now.plusHours(24));
    return slots.toString();
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @PostMapping("/user")
  public void addUser(@RequestBody Models.User user) {
    book.addUser(user);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @GetMapping("/user/{id}")
  public Models.User getUser(@PathVariable("id") int id) {
    return book.getUser(id);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @GetMapping("/user/email/{email}")
  public Models.User getUserByEmail(@PathVariable("email") String email) {
    return book.getUserByEmail(email);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @GetMapping("/users")
  public List<Models.User> getUsers() {
    return book.getUsers();
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @PostMapping("/user/findOrCreate")
  public Models.User findOrCreateUser(@RequestParam("name") String name) {
    return book.findOrCreateUser(name);
  }

  @PostMapping("/timeslot")
  public List<Models.Timeslot> findTimeslot(
      @RequestBody Models.Location location,
      @RequestParam("startTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
      @RequestParam("endTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
    return book.findTimeslot(location, startTime, endTime);
  }

  @PreAuthorize("hasAnyRole('BOOKUSER', 'BOOKADMIN')")
  @PostMapping("/bookTime")
  public void bookTime(
      @RequestParam("freeId") int freeId,
      @RequestParam(value = "userId", required = false) Integer userId,
      @RequestParam("startTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
      @RequestParam("endTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
    int effectiveUserId = (userId != null) ? userId : 0;
    org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
        .getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof UserPrincipal userPrincipal) {
      effectiveUserId = userPrincipal.getId();
    }
    book.bookTime(freeId, effectiveUserId, startTime, endTime);
  }

  @PreAuthorize("hasAnyRole('BOOKUSER', 'BOOKADMIN')")
  @DeleteMapping("/bookedTime/{bookedId}")
  public void deleteBookedTime(@PathVariable("bookedId") int bookedId) {
    book.deleteBookedTime(bookedId);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @DeleteMapping("/freeTime/{freeId}")
  public void deleteFreeTime(@PathVariable("freeId") int freeId) {
    book.deleteFreeTime(freeId);
  }

  @PreAuthorize("hasRole('BOOKADMIN')")
  @PostMapping("/freeTime")
  public void addFreeTime(
      @RequestParam("assetId") int assetId,
      @RequestParam("startTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
      @RequestParam("endTime") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
    book.addFreeTime(assetId, startTime, endTime);
  }

}
