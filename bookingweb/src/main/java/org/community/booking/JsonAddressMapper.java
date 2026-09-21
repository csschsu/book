package org.community.booking;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jdbi.v3.core.argument.AbstractArgumentFactory;
import org.jdbi.v3.core.argument.Argument;
import org.jdbi.v3.core.config.ConfigRegistry;
import org.jdbi.v3.core.mapper.ColumnMapper;
import org.jdbi.v3.core.statement.StatementContext;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

public class JsonAddressMapper {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static class Column implements ColumnMapper<Models.Address> {
        @Override
        public Models.Address map(ResultSet r, int columnNumber, StatementContext ctx) throws SQLException {
            String json = r.getString(columnNumber);
            if (json == null || json.isBlank()) {
                return null;
            }
            try {
                return objectMapper.readValue(json, Models.Address.class);
            } catch (Exception e) {
                return null;
            }
        }
    }

    public static class Factory extends AbstractArgumentFactory<Models.Address> {
        public Factory() {
            super(Types.VARCHAR);
        }

        @Override
        protected Argument build(Models.Address value, ConfigRegistry config) {
            return (position, statement, ctx) -> {
                if (value == null) {
                    statement.setNull(position, Types.VARCHAR);
                } else {
                    try {
                        statement.setString(position, objectMapper.writeValueAsString(value));
                    } catch (JsonProcessingException e) {
                        statement.setNull(position, Types.VARCHAR);
                    }
                }
            };
        }
    }
}

