package org.community.booking;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.format.support.DefaultFormattingConversionService;
import org.springframework.http.MediaType;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.converter.json.JacksonJsonHttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
public class BookControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private Book book;

    @InjectMocks
    private BookController bookController;

    @BeforeEach
    public void setUp() {
        objectMapper = JsonMapper.builder().build();

        StringHttpMessageConverter stringConverter = new StringHttpMessageConverter();
        JacksonJsonHttpMessageConverter jacksonConverter = new JacksonJsonHttpMessageConverter((JsonMapper) objectMapper);

        mockMvc = MockMvcBuilders.standaloneSetup(bookController)
                .setConversionService(new DefaultFormattingConversionService())
                .setMessageConverters(stringConverter, jacksonConverter)
                .build();
    }

    @Test
    public void testBook() throws Exception {
        mockMvc.perform(get("/book"))
                .andExpect(status().isOk())
                .andExpect(content().string("Greetings from Spring Boot!"));
    }

    @Test
    public void testFree() throws Exception {
        Models.Location location = new Models.Location();
        location.id = 1;
        location.name = "Garage A";

        List<Models.Timeslot> slots = new ArrayList<>();
        Models.Timeslot slot = new Models.Timeslot();
        slot.freeid = 10;
        slot.assetId = 15;
        slot.startTime = LocalDateTime.of(2026, 6, 30, 10, 0);
        slot.endTime = LocalDateTime.of(2026, 6, 30, 12, 0);
        slots.add(slot);

        when(book.findTimeslot(any(Models.Location.class), any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(slots);

        mockMvc.perform(post("/free")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(location)))
                .andExpect(status().isOk())
                .andExpect(content().string(slots.toString()));
    }

    @Test
    public void testAddUser() throws Exception {
        Models.User user = new Models.User();
        user.id = 201;
        user.code = 1234;
        user.name = "Jane Doe";

        mockMvc.perform(post("/user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(user)))
                .andExpect(status().isOk());

        verify(book).addUser(any(Models.User.class));
    }

    @Test
    public void testGetUser() throws Exception {
        Models.User user = new Models.User();
        user.id = 201;
        user.code = 1234;
        user.name = "Jane Doe";

        when(book.getUser(201)).thenReturn(user);

        mockMvc.perform(get("/user/201"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(201))
                .andExpect(jsonPath("$.code").value(1234))
                .andExpect(jsonPath("$.name").value("Jane Doe"));
    }

    @Test
    public void testFindTimeslot() throws Exception {
        Models.Location location = new Models.Location();
        location.id = 1;
        location.name = "Garage A";

        LocalDateTime startTime = LocalDateTime.of(2026, 6, 30, 10, 0);

        List<Models.Timeslot> slots = new ArrayList<>();
        Models.Timeslot slot = new Models.Timeslot();
        slot.freeid = 10;
        slot.assetId = 15;
        slot.startTime = startTime;
        slot.endTime = startTime.plusHours(2);
        slots.add(slot);

        when(book.findTimeslot(any(Models.Location.class), eq(startTime), any(LocalDateTime.class))).thenReturn(slots);

        mockMvc.perform(post("/timeslot")
                        .param("startTime", "2026-06-30T10:00:00")
                        .param("endTime", "2026-06-30T12:00:00")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(location)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].freeid").value(10))
                .andExpect(jsonPath("$[0].assetId").value(15))
                .andExpect(jsonPath("$[0].startTime").value("2026-06-30T10:00:00"))
                .andExpect(jsonPath("$[0].endTime").value("2026-06-30T12:00:00"));
    }

    @Test
    public void testBookTime() throws Exception {
        LocalDateTime start = LocalDateTime.of(2026, 6, 30, 10, 0);
        LocalDateTime end = LocalDateTime.of(2026, 6, 30, 12, 0);

        mockMvc.perform(post("/bookTime")
                        .param("freeId", "15")
                        .param("userId", "201")
                        .param("startTime", "2026-06-30T10:00:00")
                        .param("endTime", "2026-06-30T12:00:00"))
                .andExpect(status().isOk());

        verify(book).bookTime(15, 201, start, end);
    }

    @Test
    public void testDeleteBookedTime() throws Exception {
        mockMvc.perform(delete("/bookedTime/5"))
                .andExpect(status().isOk());

        verify(book).deleteBookedTime(5);
    }

    @Test
    public void testDeleteFreeTime() throws Exception {
        mockMvc.perform(delete("/freeTime/7"))
                .andExpect(status().isOk());

        verify(book).deleteFreeTime(7);
    }
}
