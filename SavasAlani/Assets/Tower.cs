using UnityEngine;
using System.Collections;

public class Tower : MonoBehaviour
{
    [Header("Tower Settings")]
    [SerializeField] private float range = 10f;              // Kulenin menzili
    [SerializeField] private float fireRate = 1f;            // Saniye başına ateş sayısı
    [SerializeField] private float damage = 25f;             // Hasar miktarı
    
    [Header("Projectile Settings")]
    [SerializeField] private GameObject projectilePrefab;    // Mermi prefab'ı
    [SerializeField] private Transform firePoint;            // Merminin çıkış noktası
    [SerializeField] private float projectileSpeed = 20f;    // Mermi hızı
    
    [Header("Visual Settings")]
    [SerializeField] private Transform towerHead;            // Kulenin dönen kısmı (opsiyonel)
    [SerializeField] private float rotationSpeed = 5f;       // Dönüş hızı
    
    private Transform currentTarget;                         // Şu anki hedef
    private float fireCountdown = 0f;                        // Ateş etme sayacı
    
    void Start()
    {
        // Ateş etmeye başlamak için tekrar eden fonksiyon
        InvokeRepeating(nameof(UpdateTarget), 0f, 0.5f);
    }
    
    void Update()
    {
        if (currentTarget == null)
            return;
        
        // Kule başını hedefe doğru döndür
        RotateTowardsTarget();
        
        // Ateş etme
        if (fireCountdown <= 0f)
        {
            Fire();
            fireCountdown = 1f / fireRate;
        }
        
        fireCountdown -= Time.deltaTime;
    }
    
    /// <summary>
    /// Menzil içindeki en yakın düşmanı bulur
    /// </summary>
    void UpdateTarget()
    {
        GameObject[] enemies = GameObject.FindGameObjectsWithTag("Enemy");
        float shortestDistance = Mathf.Infinity;
        GameObject nearestEnemy = null;
        
        foreach (GameObject enemy in enemies)
        {
            float distanceToEnemy = Vector3.Distance(transform.position, enemy.transform.position);
            
            if (distanceToEnemy < shortestDistance)
            {
                shortestDistance = distanceToEnemy;
                nearestEnemy = enemy;
            }
        }
        
        // Hedef menzil içinde mi kontrol et
        if (nearestEnemy != null && shortestDistance <= range)
        {
            currentTarget = nearestEnemy.transform;
        }
        else
        {
            currentTarget = null;
        }
    }
    
    /// <summary>
    /// Kule başını hedefe doğru yumuşak bir şekilde döndürür
    /// </summary>
    void RotateTowardsTarget()
    {
        if (towerHead == null)
            return;
        
        Vector3 direction = currentTarget.position - towerHead.position;
        Quaternion lookRotation = Quaternion.LookRotation(direction);
        Vector3 rotation = Quaternion.Lerp(towerHead.rotation, lookRotation, Time.deltaTime * rotationSpeed).eulerAngles;
        towerHead.rotation = Quaternion.Euler(0f, rotation.y, 0f);
    }
    
    /// <summary>
    /// Hedefe ateş eder
    /// </summary>
    void Fire()
    {
        if (projectilePrefab != null && firePoint != null)
        {
            GameObject projectileGO = Instantiate(projectilePrefab, firePoint.position, firePoint.rotation);
            Projectile projectile = projectileGO.GetComponent<Projectile>();
            
            if (projectile != null)
            {
                projectile.Seek(currentTarget, damage);
            }
        }
    }
    
    /// <summary>
    /// Menzili görselleştirmek için Gizmo çizer (Editor'de görünür)
    /// </summary>
    void OnDrawGizmosSelected()
    {
        Gizmos.color = Color.red;
        Gizmos.DrawWireSphere(transform.position, range);
    }
}
