package com.snapgram.service;

import com.snapgram.model.LoginHistory;
import com.snapgram.repository.LoginHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginHistoryService {

    private final LoginHistoryRepository loginHistoryRepository;

    public Page<LoginHistory> getLoginHistory(String userId, int page, int size) {
        return loginHistoryRepository.findByUserIdOrderByLoginAtDesc(
                userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "loginAt")));
    }

    public void terminateSession(String sessionToken) {
        loginHistoryRepository.findBySessionToken(sessionToken).ifPresent(h -> {
            h.setActive(false);
            loginHistoryRepository.save(h);
        });
    }
}
