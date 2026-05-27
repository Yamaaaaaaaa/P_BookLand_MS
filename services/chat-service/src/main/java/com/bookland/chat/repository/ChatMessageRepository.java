package com.bookland.chat.repository;

import com.bookland.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    @Query("SELECT cm FROM ChatMessage cm WHERE " +
           "(cm.fromUserId = :userId1 AND cm.toUserId = :userId2) OR " +
           "(cm.fromUserId = :userId2 AND cm.toUserId = :userId1) " +
           "ORDER BY cm.createdAt ASC")
    List<ChatMessage> findChatHistory(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Query(value = "SELECT DISTINCT CASE " +
           "WHEN cm.from_user_id = :adminId THEN cm.to_user_id " +
           "ELSE cm.from_user_id END as user_id " +
           "FROM chat_message cm " +
           "WHERE cm.from_user_id = :adminId OR cm.to_user_id = :adminId", 
           nativeQuery = true)
    List<Long> findConversationUserIds(@Param("adminId") Long adminId);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.toUserId = :userId AND cm.isRead = false")
    Long countUnreadMessages(@Param("userId") Long userId);

    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.fromUserId = :fromUserId AND cm.toUserId = :toUserId AND cm.isRead = false")
    Long countUnreadMessagesBetween(@Param("fromUserId") Long fromUserId, @Param("toUserId") Long toUserId);
}
