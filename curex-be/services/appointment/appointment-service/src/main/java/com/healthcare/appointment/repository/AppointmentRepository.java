package com.healthcare.appointment.repository;

import com.healthcare.appointment.entity.Appointment;
import com.healthcare.appointment.entity.AppointmentStatus;
import com.healthcare.appointment.entity.AppointmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {

    @Query("SELECT a FROM Appointment a " +
           "WHERE LOWER(TRIM(a.patientId)) = LOWER(TRIM(:patientId)) " +
           "ORDER BY a.appointmentTime DESC")
    List<Appointment> findByPatientIdOrderByAppointmentTimeDesc(
            @Param("patientId") String patientId);

    @Query("SELECT a FROM Appointment a " +
           "WHERE LOWER(TRIM(a.doctorId)) = LOWER(TRIM(:doctorId)) " +
           "ORDER BY a.appointmentTime DESC")
    List<Appointment> findByDoctorIdOrderByAppointmentTimeDesc(
            @Param("doctorId") String doctorId);

    List<Appointment> findByPatientIdAndStatus(String patientId, AppointmentStatus status);

    List<Appointment> findByDoctorIdAndStatus(String doctorId, AppointmentStatus status);

    List<Appointment> findByStatus(AppointmentStatus status);

    // Check for slot conflicts (same doctor, overlapping time window ±30 min)
    @Query("SELECT a FROM Appointment a WHERE a.doctorId = :doctorId " +
           "AND a.status NOT IN ('CANCELLED', 'COMPLETED') " +
           "AND a.appointmentTime BETWEEN :from AND :to")
    List<Appointment> findConflictingAppointments(
            @Param("doctorId") String doctorId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    // Search by specialty (stored denormalised)
    @Query("SELECT DISTINCT a.doctorId FROM Appointment a WHERE a.doctorSpecialty = :specialty")
    List<String> findDoctorIdsBySpecialty(@Param("specialty") String specialty);

    List<Appointment> findByDoctorSpecialtyIgnoreCaseAndStatus(
            String specialty, AppointmentStatus status);

    List<Appointment> findByTypeAndStatus(AppointmentType type, AppointmentStatus status);

    long countByStatus(AppointmentStatus status);
}
