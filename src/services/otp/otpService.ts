import { supabase } from '../../lib/supabaseClient';

export interface OTPVerification {
  id: string;
  phone: string;
  code: string;
  user_id: string | null;
  user_type: string | null;
  purpose: 'phone_verification' | 'password_reset';
  is_verified: boolean;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

export class OTPService {
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async createOTP(
    phone: string,
    userId: string,
    userType: string,
    purpose: 'phone_verification' | 'password_reset'
  ): Promise<{ otpId: string; code: string }> {
    const code = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { data, error } = await supabase
      .from('otp_verifications')
      .insert({
        phone,
        code,
        user_id: userId,
        user_type: userType,
        purpose,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating OTP:', error);
      throw new Error('فشل في إنشاء رمز التحقق: ' + error.message);
    }

    console.log(`[OTP Generated] Phone: ${phone}, Code: ${code}, Expires: ${expiresAt.toISOString()}`);

    return { otpId: data.id, code };
  }

  static async verifyOTP(
    phone: string,
    code: string,
    purpose: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('code', code)
      .eq('purpose', purpose)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }

    if (!data) {
      console.log('[OTP Verify] No matching OTP found');
      return false;
    }

    if (data.attempts >= data.max_attempts) {
      console.log('[OTP Verify] Max attempts exceeded');
      return false;
    }

    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('Error updating OTP verification:', updateError);
      return false;
    }

    if (purpose === 'phone_verification' && data.user_id) {
      await supabase
        .from('beneficiaries')
        .update({
          phone_otp_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq('id', data.user_id);
    }

    console.log('[OTP Verify] Success for phone:', phone);
    return true;
  }

  static async incrementAttempts(phone: string, code: string): Promise<void> {
    try {
      const { data } = await supabase
        .from('otp_verifications')
        .select('id, attempts')
        .eq('phone', phone)
        .eq('code', code)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        await supabase
          .from('otp_verifications')
          .update({ attempts: data.attempts + 1 })
          .eq('id', data.id);

        console.log(`[OTP] Incremented attempts for phone: ${phone}, now: ${data.attempts + 1}`);
      }
    } catch (error) {
      console.error('Error incrementing OTP attempts:', error);
    }
  }

  static async getActiveOTP(phone: string, purpose: string): Promise<OTPVerification | null> {
    const { data, error } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('phone', phone)
      .eq('purpose', purpose)
      .eq('is_verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active OTP:', error);
      return null;
    }

    return data as OTPVerification | null;
  }

  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const { error } = await supabase
        .from('otp_verifications')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error cleaning up expired OTPs:', error);
      } else {
        console.log('[OTP Cleanup] Removed expired OTPs');
      }
    } catch (error) {
      console.error('Error in OTP cleanup:', error);
    }
  }

  static formatPhoneForDisplay(phone: string): string {
    if (phone.length === 10 && phone.startsWith('05')) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  }

  static getRemainingTime(expiresAt: string): number {
    const expiry = new Date(expiresAt).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
    return remaining;
  }
}
