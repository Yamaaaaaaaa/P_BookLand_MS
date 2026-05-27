package com.bookland.search.document;

import lombok.*;
import lombok.experimental.FieldDefaults;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.LocalDate;
import java.util.Set;

@Document(indexName = "books")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class BookDocument {

    @Id
    String id; // Elasticsearch Document ID (String format)

    @Field(type = FieldType.Long)
    Long bookId; // Original Book ID from MySQL

    @Field(type = FieldType.Text, analyzer = "standard")
    String name;

    @Field(type = FieldType.Text, analyzer = "standard")
    String description;

    @Field(type = FieldType.Double)
    Double originalCost;

    @Field(type = FieldType.Double)
    Double sale;

    @Field(type = FieldType.Double)
    Double finalPrice;

    @Field(type = FieldType.Integer)
    Integer stock;

    @Field(type = FieldType.Keyword)
    String status;

    @Field(type = FieldType.Date)
    LocalDate publishedDate;

    @Field(type = FieldType.Keyword)
    String bookImageUrl;

    @Field(type = FieldType.Boolean)
    Boolean pin;

    @Field(type = FieldType.Long)
    Long authorId;

    @Field(type = FieldType.Text, analyzer = "standard")
    String authorName;

    @Field(type = FieldType.Long)
    Long publisherId;

    @Field(type = FieldType.Text, analyzer = "standard")
    String publisherName;

    @Field(type = FieldType.Long)
    Long seriesId;

    @Field(type = FieldType.Text, analyzer = "standard")
    String seriesName;

    @Field(type = FieldType.Long)
    Set<Long> categoryIds;
}
