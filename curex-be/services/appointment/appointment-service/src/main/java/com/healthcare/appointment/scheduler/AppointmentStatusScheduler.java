package com.healthcare.appointment.scheduler;

import com.healthcare.appointment.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentStatusScheduler {

    private final AppointmentService appointmentService;

    @Scheduled(
            fixedRateString = "${appointment.status-transition.interval-ms:5000}",
            initialDelayString = "${appointment.status-transition.initial-delay-ms:1000}"
    )
    public void moveStartedAppointmentsToInSession() {
        int updated = appointmentService.transitionStartedAppointmentsToInSession();
        if (updated > 0) {
            log.info("Auto-transitioned {} appointment(s) to IN_SESSION", updated);
        }
    }
}
