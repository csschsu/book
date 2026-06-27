package org.community.booking;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jdbi.v3.core.argument.Argument;
import org.jdbi.v3.core.argument.ArgumentFactory;
import org.jdbi.v3.core.config.ConfigRegistry;
import org.jdbi.v3.core.mapper.ColumnMapper;
import org.jdbi.v3.core.statement.StatementContext;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

public class JsonAddressMapper {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Läser från databasen: Omvandlar JSON-text i SQLite till
     * Models.address-objekt.
     */
    public static class Column implements ColumnMapper<Models.address> {
        @Override
        public Models.address map(ResultSet r, int columnNumber, StatementContext ctx) throws SQLException {
            String json = r.getString(columnNumber);
            if (json == null || json.isEmpty()) {
                return null;
            }
            try {
                return objectMapper.readValue(json, Models.address.class);
            } catch (Exception e) {
                throw new SQLException("Kunde inte deserialisera JSON till Models.address", e);
            }
        }
    }

    /**
     * Skriver till databasen: Omvandlar Models.address-objekt till JSON-text.
     */
    public static class Factory implements ArgumentFactory {
        @Override
        public Optional<Argument> build(java.lang.reflect.Type type, Object value, ConfigRegistry config) {
            if (type == Models.address.class && value != null) {
                return Optional.of((position, statement, ctx) -> {
                    try {
                        String json = objectMapper.writeValueAsString(value);
                        statement.setString(position, json);
                    } catch (Exception e) {
                        throw new SQLException("Kunde inte serialisera Models.address till JSON", e);
                    }
                });
            }
            return Optional.empty();
        }
    }
}
