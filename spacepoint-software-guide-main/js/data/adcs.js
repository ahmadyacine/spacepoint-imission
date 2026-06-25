/**
 * SpacePoint Software Guide Platform
 * data/adcs.js - ADCS Lessons & Resources
 */

window.spacePointData.categories.push({
    id: 'adcs',
    title: 'ADCS',
    description: 'Attitude Determination & Control System.',
    icon: 'compass',
    timeEstimate: '2.5 hours',
    color: 'from-pink-500 to-rose-500',
    lessons: [
        { 
            id: 'motor-driver', 
            title: 'Motor Driver', 
            time: '45 min',
            hasPractice: true,
            practiceType: 'motor_pwm',
            content: `
                <h3 class="text-xl font-bold mb-2">Motor Control</h3>
                <p class="mb-4">We use reaction wheels driven by DC motors to orient the satellite. This requires PWM (Pulse Width Modulation) for speed control.</p>
            ` 
        },
        { 
            id: 'mpu', 
            title: 'MPU (IMU)', 
            time: '40 min',
            hasPractice: true,
            practiceType: 'mpu_i2c',
            content: `
                <h3 class="text-xl font-bold mb-2">MPU6050 (IMU)</h3>
                <p class="mb-4">Inertial Measurement Unit. Contains an Accelerometer and Gyroscope to determine the satellite's orientation (attitude) in space.</p>
            ` 
        }
    ]
});

// Resources for ADCS
window.spacePointData.resources['motor-driver'] = [
    { type: 'Article', title: 'ESP32 PWM Guide', org: 'Random Nerd', desc: 'Using LEDC for PWM control.', url: 'https://randomnerdtutorials.com/esp32-pwm-arduino-ide/' }
];

window.spacePointData.resources['mpu'] = [
    { type: 'Article', title: 'ESP32 MPU6050 Guide', org: 'Random Nerd', desc: 'Accelerometer and Gyroscope data.', url: 'https://randomnerdtutorials.com/esp32-mpu6050-accelerometer-gyroscope-arduino/' }
];
