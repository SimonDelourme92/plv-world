// Arcade au sol uniquement. Les collisions restent fournies par le moteur PLV WORLD.
export class SedanDynamics {
  constructor() {
    this.x = 0;
    this.z = 0;
    this.yaw = 0;
    this.speed = 0;
    this.lateral = 0;
    this.steer = 0;
    this.throttle = 0;
    this.rpm = 850;
    this.gear = 1;
    this.shiftTimer = 0;
    this.wheelAngle = 0;
    this.slip = 0;
    this.braking = false;
    this.handbrake = false;
    this.blocked = false;
    this.travel = 0;
  }
  reset(x, z, yaw) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.speed = this.lateral = this.steer = this.throttle = this.slip = 0;
    this.gear = 1;
    this.rpm = 850;
    this.shiftTimer = 0;
  }
  step(dt, input, blocked) {
    dt = Math.max(0, Math.min(0.05, dt));
    if (!dt) return;
    const f = !!input.forward,
      b = !!input.reverse,
      h = !!input.handbrake,
      both = f && b;
    this.handbrake = h;
    this.blocked = false;
    this.travel = 0;
    const braking =
      both || (b && this.speed > 0.35) || (f && this.speed < -0.35);
    this.braking = braking || h;
    const requested = (f || b) && !both ? 1 : 0;
    this.throttle += (requested - this.throttle) * (1 - Math.exp(-dt * 5));
    let acceleration = 0;
    if (braking) acceleration = -Math.sign(this.speed) * 10.5;
    else if (f)
      acceleration =
        5.6 *
        this.throttle *
        Math.max(0.12, 1 - Math.abs(this.speed) / (input.boost ? 38.9 : 30.56));
    else if (b)
      acceleration =
        -3.6 * this.throttle * Math.max(0, 1 - Math.abs(this.speed) / 7);
    else
      acceleration =
        -Math.sign(this.speed) * (1.0 + Math.abs(this.speed) * 0.014);
    if (h) acceleration -= Math.sign(this.speed) * 8.8;
    const before = this.speed;
    this.speed += acceleration * dt;
    if ((braking || h || !requested) && before * this.speed < 0) this.speed = 0;
    if (Math.abs(this.speed) < 0.025 && !requested) this.speed = 0;
    this.speed = Math.max(-7, Math.min(input.boost ? 38.9 : 30.56, this.speed));
    const limit = 0.54 / (1 + Math.abs(this.speed) * 0.13),
      targetSteer = Math.max(-1, Math.min(1, input.turn || 0)) * limit;
    this.steer += (targetSteer - this.steer) * (1 - Math.exp(-dt * 7));
    const yawRate = (-this.speed / 2.81) * Math.tan(this.steer);
    this.lateral +=
      (yawRate * this.speed * 0.2 - this.lateral * (h ? 1.7 : 6.5)) * dt;
    this.lateral = Math.max(-4, Math.min(4, this.lateral));
    const steps = Math.max(
        1,
        Math.ceil(
          ((Math.abs(this.speed) + Math.abs(this.lateral)) * dt) / 0.22,
        ),
      ),
      step = dt / steps;
    for (let i = 0; i < steps; i++) {
      const yaw = this.yaw + yawRate * step,
        mid = (this.yaw + yaw) * 0.5;
      const x =
        this.x +
        (-Math.sin(mid) * this.speed + Math.cos(mid) * this.lateral) * step;
      const z =
        this.z +
        (-Math.cos(mid) * this.speed - Math.sin(mid) * this.lateral) * step;
      if (blocked(x, z, yaw)) {
        this.speed = this.lateral = 0;
        this.blocked = true;
        break;
      }
      this.x = x;
      this.z = z;
      this.yaw = yaw;
      this.travel += this.speed * step;
    }
    this.wheelAngle = (this.wheelAngle - this.travel / 0.328) % (Math.PI * 2);
    const burnout = h && f && Math.abs(this.speed) < 2;
    if (burnout) this.wheelAngle -= this.throttle * 9 * dt;
    this.slip = Math.min(
      1,
      Math.abs(this.lateral) * 0.45 +
        (h && Math.abs(this.speed) > 3 ? 0.55 : 0) +
        (burnout ? this.throttle * 0.8 : 0) +
        (braking && Math.abs(before) > 12 ? 0.25 : 0),
    );
    this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    if (this.speed < -0.35) this.gear = -1;
    else if (this.gear < 1) this.gear = 1;
    const ratio = [0, 3.7, 2.4, 1.7, 1.3, 1, 0.82],
      gearRatio = this.gear < 0 ? 3.3 : ratio[this.gear];
    const mechanical =
      (Math.abs(this.speed) / (0.328 * Math.PI * 2)) * 60 * 3.2 * gearRatio;
    if (!h && !this.shiftTimer && this.gear > 0) {
      if (mechanical > 4300 && this.gear < 6) {
        this.gear++;
        this.shiftTimer = 0.24;
      } else if (mechanical < 1400 && this.gear > 1) {
        this.gear--;
        this.shiftTimer = 0.18;
      }
    }
    let rpm = Math.max(850, mechanical + this.throttle * 350);
    if (this.shiftTimer) rpm *= 0.73;
    if (burnout) rpm = 850 + this.throttle * 3700;
    rpm = Math.min(6200, rpm);
    this.rpm += (rpm - this.rpm) * (1 - Math.exp(-dt * 8));
  }
}
