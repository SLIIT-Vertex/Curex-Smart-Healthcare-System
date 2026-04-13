package com.healthcare.appointment.service;

import com.healthcare.appointment.dto.UpdateAppointmentRequest;
import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.entity.AppointmentType;
import com.healthcare.appointment.repository.AppointmentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests : appointment transitions & PATCH guards
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:appt_lifecycle;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "appointment.status-transition.zone=UTC",
        "appointment.stub-mode=true",
        "spring.rabbitmq.listener.simple.auto-startup=false"
})
class AppointmentServiceLifecycleIntegrationTest {

    @MockBean
    private ConnectionFactory connectionFactory;

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private AppointmentRepository appointmentRepository;

    private Appointment saveAppointment(AppointmentStatus status, LocalDateTime appointmentTime) {
        return Objects.requireNonNull(appointmentRepository.save(Objects.requireNonNull(Appointment.builder()
                .patientId("patient-1")
                .patientName("Pat")
                .patientEmail("p@test.com")
                .doctorId("doctor-1")
                .doctorName("Dr")
                .doctorSpecialty("General")
                .slotId("slot-1")
                .appointmentTime(appointmentTime)
                .legacyAppointmentDateTime(appointmentTime)
                .status(status)
                .type(AppointmentType.TELEMEDICINE)
                .build())));
    }

    @Nested
    @DisplayName("Test A — scheduler / transition to IN_SESSION")
    class TransitionToInSession {

        @Test
        void confirmedWithStartTimeInPastMovesToInSession() {
            LocalDateTime past = LocalDateTime.now(ZoneId.of("UTC")).minusMinutes(3);
            Appointment a = saveAppointment(AppointmentStatus.CONFIRMED, past);

            int updated = appointmentService.transitionStartedAppointmentsToInSession();
            assertThat(updated).isGreaterThanOrEqualTo(1);

            String appointmentId = Objects.requireNonNull(a.getId(), "appointment id");
            Appointment reloaded = appointmentRepository.findById(appointmentId).orElseThrow();
            assertThat(reloaded.getStatus()).isEqualTo(AppointmentStatus.IN_SESSION);
        }
    }

    @Nested
    @DisplayName("Test D — cannot skip IN_SESSION when PATCHing status")
    class StateMachineGuard {

        @Test
        void cannotPatchConfirmedDirectlyToCompleted() {
            LocalDateTime future = LocalDateTime.now(ZoneId.of("UTC")).plusHours(2);
            Appointment a = saveAppointment(AppointmentStatus.CONFIRMED, future);

            UpdateAppointmentRequest req = new UpdateAppointmentRequest();
            req.setStatus(AppointmentStatus.COMPLETED);

            assertThatThrownBy(() -> appointmentService.updateAppointment(a.getId(), req))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("in session");
        }
    }

    @Nested
    @DisplayName("Test E — CANCELLED is terminal for PATCH status changes")
    class CancelledTerminal {

        @ParameterizedTest
        @EnumSource(value = AppointmentStatus.class, names = {"PENDING", "CONFIRMED", "IN_SESSION"})
        void canPatchToCancelledFromNonTerminalStates(AppointmentStatus from) {
            LocalDateTime future = LocalDateTime.now(ZoneId.of("UTC")).plusHours(1);
            Appointment a = saveAppointment(from, future);

            UpdateAppointmentRequest req = new UpdateAppointmentRequest();
            req.setStatus(AppointmentStatus.CANCELLED);

            var response = appointmentService.updateAppointment(a.getId(), req);
            assertThat(response.getStatus()).isEqualTo(AppointmentStatus.CANCELLED);
        }

        @Test
        void cannotPatchAwayFromCancelled() {
            LocalDateTime future = LocalDateTime.now(ZoneId.of("UTC")).plusHours(1);
            Appointment a = saveAppointment(AppointmentStatus.CANCELLED, future);

            UpdateAppointmentRequest req = new UpdateAppointmentRequest();
            req.setStatus(AppointmentStatus.CONFIRMED);

            assertThatThrownBy(() -> appointmentService.updateAppointment(a.getId(), req))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("cancelled");
        }
    }
}
